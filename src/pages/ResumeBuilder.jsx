import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import "../styles/resume.css";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;
}

function ResumeBuilder() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    school: "",
    degree: "",
    gradYear: "",
    company: "",
    jobTitle: "",
    jobDuration: "",
    jobDescription: "",
    skills: "",
    projectTitle: "",
    projectDescription: ""
  });

  const [isListening, setIsListening] = useState(false);

  const speak = (text) => {
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);
  };

  const listenForField = (fieldName, message) => {
    if (!recognition || isListening) return;

    speak(message);
    setIsListening(true);

    const waitForTTS = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        clearInterval(waitForTTS);

        try {
          recognition.start();
        } catch (error) {
          console.warn("Recognition start error:", error.message);
        }
      }
    }, 300);

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;

      let processedText = spokenText;
      if (fieldName === "phone") {
        processedText = spokenText.replace(/\D/g, ""); // keep only numbers
      }

      setFormData((prev) => ({
        ...prev,
        [fieldName]: processedText
      }));

      speak(`You said: ${processedText}`);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      speak("Sorry, I couldn't understand.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  useEffect(() => {
    speak("Welcome to Resume Builder. Hover over each field and speak to fill it.");
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in to save your resume.");
      return;
    }

    try {
      const docRef = doc(db, "resumes", user.uid);
      await setDoc(docRef, {
        personalInfo: formData,
        updatedAt: new Date()
      });
      alert("Saved successfully!");
      navigate("/preview", { state: { formData } });
    } catch (error) {
      console.error("Error saving resume:", error);
      alert("Something went wrong while saving.");
    }
  };

  const renderInput = (label, name, type = "text", isTextarea = false) => (
    <label>
      {label}
      {isTextarea ? (
        <textarea
          name={name}
          value={formData[name]}
          onChange={handleChange}
          onMouseEnter={() => listenForField(name, `Enter your ${label}`)}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={formData[name]}
          onChange={handleChange}
          onMouseEnter={() => listenForField(name, `Enter or speak your ${label}`)}
        />
      )}
    </label>
  );

  return (
    <div className="resume-builder-container">
      <h2>🧰 Resume Builder - Step 1: Personal Info</h2>
      <form className="resume-form">
        {renderInput("Full Name", "name")}
        {renderInput("Email", "email", "email")}
        {renderInput("Phone", "phone", "tel")}
        {renderInput("Location", "location")}

        <h3>🎓 Education</h3>
        {renderInput("School / University", "school")}
        {renderInput("Degree", "degree")}
        {renderInput("Year of Passing", "gradYear")}

        <h3>💼 Work Experience</h3>
        {renderInput("Company Name", "company")}
        {renderInput("Job Title", "jobTitle")}
        {renderInput("Duration", "jobDuration")}
        {renderInput("Job Description", "jobDescription", "text", true)}

        <h3>🧠 Skills & Projects</h3>
        {renderInput("Skills (comma separated)", "skills")}
        {renderInput("Project Title", "projectTitle")}
        {renderInput("Project Description", "projectDescription", "text", true)}

        <button type="button" onClick={handleSave}>
          💾 Save & Continue
        </button>
      </form>
    </div>
  );
}

export default ResumeBuilder;
