import { BrowserRouter as Router } from "react-router-dom";
import {AuthProvider} from "./context/AuthContext.jsx";
import AppContent from "./Content/AppContent.jsx";

function App() {
  return (
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
  );
}

export default App;