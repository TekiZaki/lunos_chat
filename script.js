document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const chatBox = document.getElementById("chat-box");
  const chatForm = document.getElementById("chat-form");
  const userInput = document.getElementById("user-input");
  const clearHistoryBtn = document.getElementById("clear-history-btn");
  const modelSelect = document.getElementById("model-select");
  const modelDetailsDiv = document.getElementById("model-details");

  // Detail spans
  const detailId = document.getElementById("detail-id");
  const detailName = document.getElementById("detail-name");
  const detailProvider = document.getElementById("detail-provider");
  const detailContext = document.getElementById("detail-context");
  const detailMaxOutput = document.getElementById("detail-max-output");
  const detailSize = document.getElementById("detail-size");
  const detailPriceInput = document.getElementById("detail-price-input");
  const detailPriceOutput = document.getElementById("detail-price-output");
  const detailCapabilities = document.getElementById("detail-capabilities");
  const detailStatus = document.getElementById("detail-status");
  const detailDescription = document.getElementById("detail-description");

  // --- Configuration ---
  const PROXY_URL = "proxy.php";
  const MODELS_URL = "proxy.php"; // We'll fetch models from proxy.php GET endpoint
  const HISTORY_KEY = "lunosChatHistory";
  const SELECTED_MODEL_KEY = "lunosSelectedModel";
  const INITIAL_DATA_URL = "data.json"; // Used for initial chat message if no history

  let messages = [];
  let availableModels = [];
  let currentModelId = "";

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
   * Fetches the list of available models from the proxy.
   */
  const fetchModels = async () => {
    try {
      const response = await fetch(MODELS_URL, { method: "GET" });
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      availableModels = await response.json();
      populateModelSelect();
    } catch (error) {
      console.error("Error fetching models:", error);
      // Add a default model if fetching fails
      availableModels = [
        {
          id: "deepseek/deepseek-chat-v3-0324",
          name: "DeepSeek V3 0324 (Default)",
          parameters: { context: "-", max_output_tokens: "-", size: "-" },
          provider: "deepseek",
          pricePerMillionTokens: { input: "-", output: "-" },
          capabilities: ["text-generation"],
          status: "N/A",
          description: "Failed to load model details.",
        },
      ];
      populateModelSelect();
    }
  };

  /**
   * Populates the model select dropdown with available models.
   */
  const populateModelSelect = () => {
    modelSelect.innerHTML = ""; // Clear existing options
    availableModels.forEach((model) => {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.name;
      modelSelect.appendChild(option);
    });

    // Set selected model from localStorage or default to the first one
    const savedModelId = localStorage.getItem(SELECTED_MODEL_KEY);
    if (savedModelId && availableModels.some((m) => m.id === savedModelId)) {
      modelSelect.value = savedModelId;
      currentModelId = savedModelId;
    } else if (availableModels.length > 0) {
      modelSelect.value = availableModels[0].id;
      currentModelId = availableModels[0].id;
    }
    displaySelectedModelDetails();
  };

  /**
   * Displays the details of the currently selected model.
   */
  const displaySelectedModelDetails = () => {
    const selectedModel = availableModels.find(
      (model) => model.id === modelSelect.value
    );

    if (selectedModel) {
      detailId.textContent = selectedModel.id;
      detailName.textContent = selectedModel.name;
      detailProvider.textContent = selectedModel.provider;
      detailContext.textContent = selectedModel.parameters.context || "-";
      detailMaxOutput.textContent =
        selectedModel.parameters.max_output_tokens || "-";
      detailSize.textContent = selectedModel.parameters.size || "-";
      detailPriceInput.textContent =
        selectedModel.pricePerMillionTokens.input || "-";
      detailPriceOutput.textContent =
        selectedModel.pricePerMillionTokens.output || "-";
      detailCapabilities.textContent = selectedModel.capabilities
        ? selectedModel.capabilities.join(", ")
        : "-";
      detailStatus.textContent = selectedModel.status;
      detailDescription.textContent = selectedModel.description;
      currentModelId = selectedModel.id; // Update currentModelId
      localStorage.setItem(SELECTED_MODEL_KEY, currentModelId); // Save to localStorage
    } else {
      // Clear details if no model is selected or found
      detailId.textContent = "N/A";
      detailName.textContent = "No Model Selected";
      detailProvider.textContent = "N/A";
      detailContext.textContent = "N/A";
      detailMaxOutput.textContent = "N/A";
      detailSize.textContent = "N/A";
      detailPriceInput.textContent = "N/A";
      detailPriceOutput.textContent = "N/A";
      detailCapabilities.textContent = "N/A";
      detailStatus.textContent = "N/A";
      detailDescription.textContent =
        "Please select a model from the dropdown.";
      currentModelId = "";
      localStorage.removeItem(SELECTED_MODEL_KEY);
    }
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
    if (!currentModelId) {
      alert("Please select an AI model first!");
      return;
    }

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
        body: JSON.stringify({
          message: userText,
          modelId: currentModelId, // Send the selected model ID
        }),
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

  modelSelect.addEventListener("change", displaySelectedModelDetails);

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
  fetchModels(); // Fetch models when the page loads

  marked.setOptions({
    breaks: true, // Add <br> on single line breaks
    gfm: true, // Use GitHub Flavored Markdown
    sanitize: false, // IMPORTANT: We trust the API. If not, set to true.
  });
});
