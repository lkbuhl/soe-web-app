import React, { useState, useEffect } from "react";
import caseData from "./cases/case_017_brain_tumor.json";
import answersData from "./cases/case_017_brain_tumor_answers.json";

const analyzePhaseFeedback = (messages, phaseAnswers, phase) => {
  // Helper function for key terms with expanded synonyms and related concepts
  const includesKeyPoint = (response, point) => {
    const text = response.toLowerCase();
    const pointText = point.toLowerCase();

    const conceptMap = {
      'intracranial pressure': ['icp', 'raised pressure', 'herniation', 'papilledema', 'mental status'],
      'blood pressure': ['bp', 'hypertension', 'hypotension', 'mean arterial', 'cpp'],
      'venous air embolism': ['vae', 'air embolism', 'venous air'],
      'cerebral perfusion': ['cpp', 'cerebral blood flow', 'perfusion pressure'],
      'cranial nerve': ['cn', 'brainstem', 'nerve v', 'nerve vii', 'nerve viii'],
      'neurological status': ['mental status', 'gcs', 'pupillary', 'cranial nerve', 'consciousness'],
      'monitoring': ['arterial line', 'evd', 'neuromonitoring', 'ssep', 'baer', 'eeg'],
      'ventilation': ['co2', 'paco2', 'hyperventilation', 'etco2', 'normocapnea'],
      'positioning': ['head elevation', 'neck position', 'venous drainage', 'prone', 'park bench']
    };

    // Direct match
    if (text.includes(pointText)) return true;

    // Check for related concepts
    for (const [concept, relatedTerms] of Object.entries(conceptMap)) {
      if (pointText.includes(concept)) {
        if (relatedTerms.some(term => text.includes(term))) return true;
      }
    }

    return false;
  };

  const phaseResponses = messages.filter(msg => msg.type === "candidate" && msg.phase === phase);

  const strengths = new Set();
  const improvements = new Set();

  Object.entries(phaseAnswers).forEach(([topic, answerData]) => {
    const questionResponses = phaseResponses.filter(msg => {
      const msgIndex = messages.findIndex(m => m === msg);
      const previousMessage = msgIndex > 0 ? messages[msgIndex - 1] : null;

      // Match questions more flexibly
      return previousMessage && previousMessage.text.toLowerCase().includes(
        answerData.question.toLowerCase().split(' ').slice(0, 5).join(' ')
      );
    });

    if (questionResponses.length > 0) {
      // Analyze all responses together for this topic
      const combinedResponse = questionResponses.map(r => r.text).join(' ');

      answerData.key_concepts.forEach(concept => {
        const mentionedPoints = concept.essential_points.filter(point =>
          includesKeyPoint(combinedResponse, point)
        );

        if (mentionedPoints.length >= concept.essential_points.length * 0.6) {
          // Strong understanding shown
          strengths.add({
            topic: concept.topic,
            points: mentionedPoints,
            context: concept.learning_points
          });
        } else if (mentionedPoints.length > 0) {
          // Partial understanding
          improvements.add({
            topic: concept.topic,
            points: concept.essential_points.filter(p => !mentionedPoints.includes(p)),
            context: `Consider also ${concept.learning_points}`
          });
        } else {
          // Topic not adequately addressed
          improvements.add({
            topic: concept.topic,
            points: concept.essential_points,
            context: concept.learning_points
          });
        }
      });
    }
  });

  return {
    strengths: Array.from(strengths),
    improvements: Array.from(improvements),
    phase
  };
};

const ExamFeedback = ({ messages, onClose }) => {
  const [feedbackContent, setFeedbackContent] = useState(null);

  useEffect(() => {
    const generateFeedback = async () => {
      try {
        const answers = answersData;

        const feedback = {
          preoperative: analyzePhaseFeedback(messages, answers.preoperative, 'preop'),
          intraoperative: analyzePhaseFeedback(messages, answers.intraoperative, 'intraop'),
          postoperative: analyzePhaseFeedback(messages, answers.postoperative, 'postop')
        };

        setFeedbackContent(feedback);
      } catch (error) {
        console.error('Error generating feedback:', error);
      }
    };

    generateFeedback();
  }, [messages]);

  if (!feedbackContent) return <div>Generating feedback...</div>;

  // Generate narrative feedback
  const generateNarrative = () => {
    const allStrengths = [
      ...feedbackContent.preoperative.strengths,
      ...feedbackContent.intraoperative.strengths,
      ...feedbackContent.postoperative.strengths
    ];

    const allImprovements = [
      ...feedbackContent.preoperative.improvements,
      ...feedbackContent.intraoperative.improvements,
      ...feedbackContent.postoperative.improvements
    ];

    let narrative = [];

    // Acknowledge demonstrated knowledge
    if (allStrengths.length > 0) {
      const strengthTopics = allStrengths.map(s => s.topic.toLowerCase());
      narrative.push(
        <p key="strengths">
          Your responses demonstrated comprehensive understanding of
          {strengthTopics.slice(0, 3).join(', ')}.
          {allStrengths[0].context}
        </p>
      );
    }

    // Suggest areas for improvement
    if (allImprovements.length > 0) {
      const improvementTopics = allImprovements.map(i => i.topic.toLowerCase());
      narrative.push(
        <p key="improvements">
          To enhance your response, consider expanding your discussion of
          {improvementTopics.slice(0, 2).join(' and ')}.
          {allImprovements[0].context}
        </p>
      );
    }

    // Add summary if there are both strengths and improvements
    if (allStrengths.length > 0 && allImprovements.length > 0) {
      narrative.push(
        <p key="summary">
          Overall, your answers showed good clinical reasoning. Continue to develop your knowledge
          of the connections between different aspects of perioperative management.
        </p>
      );
    }

    return (
      <div className="text-lg space-y-4">
        {narrative}
      </div>
    );
};

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <h2 style={{ marginBottom: '20px', fontSize: '1.5rem', fontWeight: 'bold' }}>
          Examination Feedback
        </h2>

        {generateNarrative()}

        <button
          onClick={onClose}
          style={{
            backgroundColor: '#3490dc',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          Close Feedback
        </button>
      </div>
    </div>
  );
};

function App() {
  const [examState, setExamState] = useState("pre-exam");
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [jwt, setJwt] = useState(null);
  const [currentPhase, setCurrentPhase] = useState("preop");
  const [questionsInPhase, setQuestionsInPhase] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => { const getJwt = async () => {
      try {
        const response = await fetch("/api/get-jwt", { method: "POST" });
        const data = await response.json();
        setJwt(data.jwt);
      } catch (error) {
        console.error("Failed to get JWT:", error);
      }
    };
    getJwt();
  }, []);

  const checkPhaseTransition = () => {
    if (questionsInPhase >= 5) {
      if (currentPhase === "preop") {
        setCurrentPhase("intraop");
        setQuestionsInPhase(0);
      } else if (currentPhase === "intraop") {
        setCurrentPhase("postop");
        setQuestionsInPhase(0);
      }
    }
  };

  const startExam = () => {
    setExamState("in-progress");
    setQuestionsInPhase(1);
    setMessages([{
      type: "examiner",
      text: `${caseData.vignette}\n\nI would like to start by asking: What are the special considerations in preoperative evaluation of this patient?`
    }]);
  };

  const handleSubmit = async () => {
    if (!userInput.trim()) return;
    
    const newMessages = [...messages, { type: "candidate", text: userInput, phase: currentPhase }];
    setMessages(newMessages);
    setUserInput("");

    try {
      const phaseQuestions = caseData.examPhases[currentPhase].suggestedQuestions;
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${jwt}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are conducting an oral board examination in anesthesiology about ${caseData.title}. 
              Current phase: ${currentPhase}
              Available topics: ${JSON.stringify(phaseQuestions)}
              
              Your behavior must precisely match actual oral board examiners:
              1. Maintain complete neutrality - never praise, criticize, or indicate if answers are right/wrong
              2. Ask focused, specific follow-up questions about topics the candidate mentions
              3. If an answer is incomplete or incorrect, ask for clarification without revealing the deficiency
              4. Keep your responses brief and focused solely on the next question
              5. Use a formal, professional tone
              6. Do not summarize or evaluate the candidate's performance
              7. Do not use phrases like "Let's discuss" or "Tell me more" - just ask direct questions
              8. Never reveal what you're looking for in an answer
              9. Do not announce phase transitions - simply move to the next phase's topics naturally

              Phase-specific focus:
              - Preop phase: Focus on patient evaluation, medical optimization, and anesthetic planning
              - Intraop phase: Focus on anesthetic management, monitoring, and intraoperative complications
              - Postop phase: Focus on emergence, recovery, and postoperative complications`
            },
            ...newMessages.map(msg => ({
              role: msg.type === "examiner" ? "assistant" : "user",
              content: msg.text
            }))
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response format from API");
      }

      setQuestionsInPhase(prev => prev + 1);
      const isExamEnding = currentPhase === "postop" && questionsInPhase >= 4;

      if (isExamEnding) {
        setExamState("completed");
        setMessages(prev => [...prev, {
          type: "examiner",
          text: "This is the end of your exam."
        }]);
      } else {
        checkPhaseTransition();
        setMessages(prev => [...prev, {
          type: "examiner",
          text: data.choices[0].message.content
        }]);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, {
        type: "examiner",
        text: "I apologize for the technical difficulty. Let us continue our discussion. What more can you tell me about this topic?"
      }]);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      {examState === "pre-exam" ? (
        <div>
          <h1>SOE Simulator</h1>
          <h2>{caseData.title}</h2>
          <button 
            onClick={startExam}
            style={{ backgroundColor: "#3490dc", color: "white", padding: "10px 20px" }}
          >
            Start Exam Session
          </button>
        </div>
      ) : examState === "completed" ? (
        <div>
          <h2>Examination Complete</h2>
          <div style={{ height: "400px", overflowY: "auto", border: "1px solid #ddd", padding: "10px" }}>
            {messages.map((msg, index) => (
              <div key={index} style={{
                margin: "10px 0",
                padding: "10px",
                backgroundColor: msg.type === "examiner" ? "#f7fafc" : "#e3f2fd"
              }}>
                <strong>{msg.type === "examiner" ? "Examiner: " : "You: "}</strong>
                {msg.text}
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowFeedback(true)}
            style={{
              backgroundColor: "#3490dc",
              color: "white",
              padding: "10px 20px",
              marginTop: "20px"
            }}
           >
            View Feedback
          </button> 
        </div>
      ) : (
        <div>
          <div style={{ height: "400px", overflowY: "auto", border: "1px solid #ddd", padding: "10px" }}>
            {messages.map((msg, index) => (
              <div key={index} style={{
                margin: "10px 0",
                padding: "10px",
                backgroundColor: msg.type === "examiner" ? "#f7fafc" : "#e3f2fd"
              }}>
                <strong>{msg.type === "examiner" ? "Examiner: " : "You: "}</strong>
                {msg.text}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              style={{ flex: 1, padding: "8px" }}
              onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
            />
            <button 
              onClick={handleSubmit}
              style={{ backgroundColor: "#3490dc", color: "white", padding: "8px 16px" }}
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {showFeedback && (
        <ExamFeedback
          messages={messages}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  );
}

export default App
