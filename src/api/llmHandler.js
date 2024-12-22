class LLMHandler {
    constructor() {
        this.jwt = null;
    }

    async initialize() {
        try {
            const response = await fetch("/api/get-jwt", {
                method: "POST"
            });
            if (!response.ok) {
                throw new Error(`JWT fetch failed: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            this.jwt = data.jwt;
            console.log("JWT obtained successfully");
        } catch (error) {
            console.error("Detailed initialization error:", error);
            throw error;
        }
    }

    async getExaminerResponse(conversation) {
        try {
            if (!this.jwt) {
                console.error("No JWT available");
                throw new Error("Authentication not initialized");
            }

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.jwt}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: "system",
                            content: "You are an oral board examiner for the American Board of Anesthesiology. Follow these rules: 1. Maintain a neutral, professional tone 2. Ask focused questions about anesthesia topics 3. Interrupt if answers are too long or off-topic 4. Follow up on incomplete or incorrect responses 5. Cover all key concepts within the time limit"
                        },
                        ...conversation.messages.map(msg => ({
                            role: msg.type === "examiner" ? "assistant" : "user",
                            content: msg.text
                        }))
                    ],
                    temperature: 0.7,
                    max_tokens: 200
                })
            });

            if (!response.ok) {
                throw new Error(`API call failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error("Detailed API error:", error);
            return `Error: ${error.message}`;
        }
    }
}

export default LLMHandler;
