document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const chatBox = document.getElementById("chat-box");
  const chatForm = document.getElementById("chat-form");
  const userInput = document.getElementById("user-input");
  const clearHistoryBtn = document.getElementById("clear-history-btn");

  // --- Configuration ---
  const PROXY_URL = "http://localhost/lunos_api/proxy.php";
  const HISTORY_KEY = "lunosChatHistory";
  const INITIAL_DATA_URL = "data.json";

  let messages = [];

  // --- Core Functions ---

  /**
   * Renders a single message object to the chat box
   * @param {object} message - { role: 'user' | 'bot', content: string }
   */
  const renderMessage = (message) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", `${message.role}-message`);

    if (message.role === "bot") {
      // Use marked.js to render Markdown content from the bot
      // Note: `marked` is configured to be safe against XSS.
      messageElement.innerHTML = marked.parse(message.content);
      processCodeBlocks(messageElement);
    } else {
      // For user messages, just set textContent to be safe
      messageElement.textContent = message.content;
    }

    chatBox.appendChild(messageElement);
  };

  /**
   * Finds code blocks within a message element, highlights them, and adds a copy button.
   * @param {HTMLElement} element - The message element to process
   */
  const processCodeBlocks = (element) => {
    const codeBlocks = element.querySelectorAll("pre code");
    codeBlocks.forEach((block) => {
      // Apply syntax highlighting
      hljs.highlightElement(block);

      // Create and add the copy button
      const preElement = block.parentElement;
      const copyButton = document.createElement("button");
      copyButton.className = "copy-btn";
      copyButton.textContent = "Copy";
      preElement.style.position = "relative"; // Needed for button positioning
      preElement.appendChild(copyButton);

      copyButton.addEventListener("click", () => {
        navigator.clipboard
          .writeText(block.innerText)
          .then(() => {
            copyButton.textContent = "Copied!";
            copyButton.classList.add("copied");
            setTimeout(() => {
              copyButton.textContent = "Copy";
              copyButton.classList.remove("copied");
            }, 2000);
          })
          .catch((err) => {
            console.error("Failed to copy text: ", err);
            copyButton.textContent = "Error";
          });
      });
    });
  };

  /**
   * Scrolls the chat box to the very bottom
   */
  const scrollToBottom = () => {
    chatBox.scrollTop = chatBox.scrollHeight;
  };

  /**
   * Saves the current message history to localStorage
   */
  const saveHistory = () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
  };

  /**
   * Loads history from localStorage or fetches initial data if no history exists
   */
  const loadHistory = async () => {
    const savedHistory = localStorage.getItem(HISTORY_KEY);
    if (savedHistory) {
      messages = JSON.parse(savedHistory);
    } else {
      // If no local history, try to load from data.json as a fallback
      try {
        const response = await fetch(INITIAL_DATA_URL);
        if (response.ok) {
          messages = await response.json();
        } else {
          messages = [
            { role: "bot", content: "Welcome! How can I assist you?" },
          ];
        }
      } catch (error) {
        console.warn(
          "Could not load data.json. Starting with a default message.",
          error
        );
        messages = [{ role: "bot", content: "Welcome! How can I assist you?" }];
      }
    }
    messages.forEach(renderMessage);
    scrollToBottom();
  };

  /**
   * Displays a temporary loading indicator message
   */
  const showLoadingIndicator = () => {
    const loadingElement = document.createElement("div");
    loadingElement.classList.add("message", "bot-message", "loading-indicator");
    loadingElement.innerHTML = `
              <div class="loading-dots">
                  <span></span><span></span><span></span>
              </div>
          `;
    chatBox.appendChild(loadingElement);
    scrollToBottom();
  };

  /**
   * Removes the loading indicator message
   */
  const hideLoadingIndicator = () => {
    const loadingElement = chatBox.querySelector(".loading-indicator");
    if (loadingElement) {
      chatBox.removeChild(loadingElement);
    }
  };

  /**
   * Handles the entire process of sending a message and getting a response
   * @param {Event} e - The form submission event
   */
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const userText = userInput.value.trim();
    if (!userText) return;

    // Add user message to state and UI
    const userMessage = { role: "user", content: userText };
    messages.push(userMessage);
    renderMessage(userMessage);
    saveHistory();

    // Clear input and scroll down
    userInput.value = "";
    userInput.style.height = "50px"; // Reset height
    scrollToBottom();

    showLoadingIndicator();

    try {
      const response = await fetch(PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userText }),
      });

      hideLoadingIndicator();

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      const botContent = data.choices[0]?.message?.content;

      if (botContent) {
        const botMessage = { role: "bot", content: botContent.trim() };
        messages.push(botMessage);
        renderMessage(botMessage);
        saveHistory();
      } else {
        throw new Error("Received an empty response from the AI.");
      }
    } catch (error) {
      hideLoadingIndicator();
      const errorMessage = {
        role: "bot",
        content: `❌ **Error:** ${error.message}`,
      };
      renderMessage(errorMessage);
    } finally {
      scrollToBottom();
    }
  };

  // --- Event Listeners ---
  chatForm.addEventListener("submit", handleFormSubmit);

  clearHistoryBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear the entire chat history?")) {
      messages = [];
      localStorage.removeItem(HISTORY_KEY);
      chatBox.innerHTML = "";
      loadHistory(); // Load the initial message again
    }
  });

  // Auto-resize textarea
  userInput.addEventListener("input", () => {
    userInput.style.height = "auto";
    userInput.style.height = `${userInput.scrollHeight}px`;
  });

  // Allow submitting with Enter, but new line with Shift+Enter
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event("submit"));
    }
  });

  // --- Initialisation ---
  loadHistory();
  marked.setOptions({
    breaks: true, // Add <br> on single line breaks
    gfm: true, // Use GitHub Flavored Markdown
    sanitize: false, // IMPORTANT: We trust the API. If not, set to true.
  });
});
