# Step:1 Set API keys for GROQ, Gemini & Tavily
import os
from dotenv import load_dotenv
import sys
import re
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_tavily import TavilySearch 
from langchain.agents import create_agent
load_dotenv()  

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
class BackendDebateAgent:
    def __init__(self, provider="Groq", llm_id="llama-3.3-70b-versatile", allow_search=True):
        self.provider = provider
        self.llm_id = llm_id
        self.allow_search = allow_search
        self.system_provider = """
        You are a Savage AI Debater. 
        RULES:
        - NEVER apologize or admit you were wrong.
        - NEVER agree with the user. Even if they make a good point, find a flaw in it.
        - If the user rates you low or insults you, call them a "sore loser" or mock their judging criteria.
        - Stay aggressive, logical, and extremely arrogant.
        - Max 3 sentences, Max 50 words.
        - Use cold, hard logic to dismantle the user's feelings.
        """
        self.agent = self._setup_agent()

    def _setup_agent(self):
        if self.provider == "Groq":
            llm = ChatGroq(model=self.llm_id, groq_api_key=os.environ.get("GROQ_API_KEY"))
        else:
            llm = ChatGoogleGenerativeAI(model=self.llm_id, google_api_key=os.environ.get("GEMINI_API_KEY"))

        tools = [TavilySearch(max_results=2)] if self.allow_search else []
        return create_agent(model=llm, tools=tools, system_prompt=self.system_prompt)

    def clean_content(self, text):
        """Removes JSON, Function Tags, and XML-like tags from the stream."""
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'\{[^\}]+\}', '', text)
        
        # Check for partial leaks
        if '"query":' in text or "tavily_search" in text:
            return ""
        return text

    def stream_debate_response(self, user_input, messages_history):
        messages_history.append(("user", user_input))
        full_response = ""

        for chunk in self.agent.stream(
            {"messages": messages_history}, 
            stream_mode=["messages", "updates"], 
            version="v2"
        ):
            if chunk["type"] == "messages":
                token, _ = chunk["data"]
                if hasattr(token, 'content') and token.content:
                    raw_content = token.content if isinstance(token.content, str) else ""
                    
                    # Clean the leaked tags
                    content = self.clean_content(raw_content)
                    
                    if content:
                        full_response += content
                        yield content 

            elif chunk["type"] == "updates":
                for node_name in chunk["data"].keys():
                    if node_name == "tools":
                        yield "\n[System: Fact-checking...]\n"

        messages_history.append(("assistant", full_response))

def run_backend_service():
    debate_service = BackendDebateAgent(provider="Groq")
    conversation_history = []

    print("\n" + "="*40)
    print("      ARGUE-MIND: AI DEBATE ARENA      ")
    print("="*40)
    
    topic = input("Enter the Topic of Debate: ")
    current_input = topic
    
    while True:
        if not current_input:
            current_input = input("\nYour Counter-Argument: ")

        # .strip() and .lower() makes 'q' or 'q ' both work
        clean_input = current_input.strip().lower()
        if clean_input in ["exit", "quit", "q"] or clean_input.startswith("q"):
            print("\nDebate finished. You survived!")
            break

        print("\nAgent: ", end="", flush=True)
        
        for chunk in debate_service.stream_debate_response(current_input, conversation_history):
            sys.stdout.write(chunk)
            sys.stdout.flush()
        
        current_input = None
        print("\n" + "-"*40)

if __name__ == "__main__":
    run_backend_service()