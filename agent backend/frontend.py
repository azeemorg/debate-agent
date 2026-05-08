import streamlit as st
import requests
import uuid

st.set_page_config(page_title="ArgueMind AI", page_icon="⚖️", layout="centered")

# --- Persistent Session ID ---
if "session_id" not in st.session_state:
    st.session_state.session_id = str(uuid.uuid4())
if "messages" not in st.session_state:
    st.session_state.messages = []

st.title("⚖️ ArgueMind: AI Debate Arena")
st.markdown(f"**Session ID:** `{st.session_state.session_id}` — *Memory is active.*")

# --- Sidebar ---
with st.sidebar:
    st.header("⚙️ Agent Settings")
    provider = st.selectbox("Provider", ["Groq", "Gemini"])
    model = st.selectbox("Model", ["llama-3.3-70b-versatile", "gemini-1.5-flash"])
    allow_search = st.toggle("Enable Fact-Checking (Tavily)", value=True)
    
    if st.button("Clear History"):
        st.session_state.messages = []
        st.session_state.session_id = str(uuid.uuid4()) # New ID for fresh start
        st.rerun()

# --- UI Chat History ---
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# --- Chat Logic ---
if prompt := st.chat_input("Enter your argument..."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        placeholder = st.empty()
        full_response = ""
        
        payload = {
            "session_id": st.session_state.session_id,
            "model_name": model,
            "model_provider": provider,
            "current_message": prompt,
            "allow_search": allow_search
        }

        try:
            with requests.post("http://localhost:8000/chat/stream", json=payload, stream=True) as r:
                for chunk in r.iter_content(decode_unicode=True):
                    if chunk:
                        full_response += chunk
                        placeholder.markdown(full_response + "▌")
                placeholder.markdown(full_response)
        except Exception as e:
            st.error(f"Error: {e}")

    st.session_state.messages.append({"role": "assistant", "content": full_response})