document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const chatBox = document.getElementById("chat-box");
  const chatForm = document.getElementById("chat-form");
  const userInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
  const newChatBtn = document.getElementById("new-chat-btn");
  const chatList = document.getElementById("chat-list");
  const chatTitle = document.getElementById("chat-title");

  // --- Configuration ---
  const PROXY_URL = "http://localhost/lunos_api/proxy.php";
  const APP_STATE_KEY = "lunosMultiChatApp";

  // --- SVG Icons for Buttons ---
  const COPY_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>`;
  const CHECK_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>`;
  const TRASH_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>`;

  // --- LIBRARY CONFIGURATION ---
  // Configure marked.js BEFORE any rendering happens to ensure formatting is correct.
  marked.setOptions({
    breaks: true, // This is the key option. It turns single newlines into <br> tags.
    gfm: true, // Use GitHub Flavored Markdown for better compatibility.
    sanitize: true, // ENABLED: Set to true if you don't trust the Markdown source
  });

  // --- Application State ---
  let appState = {
    activeChatId: null,
    chats: {}, // Stores chat objects by ID: { id: { title: "", messages: [], lastModified: timestamp } }
  };

  // --- State Management Functions ---

  /**
   * Saves the entire application state to localStorage.
   */
  const saveState = () => {
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(appState));
  };

  /**
   * Loads the application state from localStorage.
   * Initializes a new chat if no state is found or no active chat exists.
   */
  const loadState = () => {
    const savedState = localStorage.getItem(APP_STATE_KEY);
    if (savedState) {
      appState = JSON.parse(savedState);
      // Ensure there's always an active chat, even if the saved one was deleted somehow
      if (!appState.activeChatId || !appState.chats[appState.activeChatId]) {
        const firstChatId = Object.keys(appState.chats)[0];
        appState.activeChatId = firstChatId || null;
      }
    }
    // If no chats exist at all after loading, create a new one
    if (!appState.activeChatId) {
      createNewChat();
    } else {
      renderUI(); // Render the UI based on the loaded state
    }
  };

  // --- UI Rendering Functions ---

  /**
   * Renders the entire UI (chat list and active chat content).
   */
  const renderUI = () => {
    renderChatList();
    renderActiveChat();
  };

  /**
   * Renders the list of chats in the sidebar, sorted by last modified.
   */
  const renderChatList = () => {
    chatList.innerHTML = ""; // Clear existing list
    const sortedChats = Object.values(appState.chats).sort(
      (a, b) => b.lastModified - a.lastModified // Sort descending by last modified
    );

    sortedChats.forEach((chat) => {
      const isActive = chat.id === appState.activeChatId;
      const itemClasses = isActive
        ? "bg-blue-500/50 text-white"
        : "hover:bg-gray-700/50 text-gray-300";

      const chatItem = document.createElement("div");
      chatItem.className = `flex justify-between items-center p-2 rounded-lg cursor-pointer group ${itemClasses}`;
      chatItem.addEventListener("click", () => switchChat(chat.id)); // Click to switch chat

      const title = document.createElement("span");
      title.className = "truncate text-sm";
      title.textContent = chat.title;
      chatItem.appendChild(title);

      const deleteBtn = document.createElement("button");
      deleteBtn.innerHTML = TRASH_ICON_SVG;
      // Show delete button on hover of the chat item
      deleteBtn.className =
        "text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity";
      deleteBtn.title = "Delete Chat";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent switching chat when delete button is clicked
        deleteChat(chat.id);
      });
      chatItem.appendChild(deleteBtn);

      chatList.appendChild(chatItem);
    });
  };

  /**
   * Renders the messages of the currently active chat in the chat box.
   */
  const renderActiveChat = () => {
    const activeChat = appState.chats[appState.activeChatId];
    chatBox.innerHTML = ""; // Clear current messages
    if (activeChat) {
      chatTitle.textContent = activeChat.title; // Set main chat title
      activeChat.messages.forEach(renderMessage); // Render each message
      userInput.disabled = false; // Enable input and send button
      sendBtn.disabled = false;
    } else {
      // If no active chat (should only happen if all chats were deleted and no new one created yet)
      chatTitle.textContent = "No Chat Selected";
      userInput.disabled = true;
      sendBtn.disabled = true;
    }
    scrollToBottom();
  };

  // --- Chat Action Functions ---

  /**
   * Creates a new chat session, sets it as active, and updates the UI.
   */
  const createNewChat = () => {
    const newChatId = `chat-${Date.now()}`; // Unique ID for the new chat
    appState.chats[newChatId] = {
      id: newChatId,
      title: "New Conversation", // Default title
      messages: [{ role: "bot", content: "Hello! How can I help you today?" }], // Initial bot message
      lastModified: Date.now(),
    };
    appState.activeChatId = newChatId;
    saveState();
    renderUI();
  };

  /**
   * Switches the active chat session.
   * @param {string} chatId - The ID of the chat to switch to.
   */
  const switchChat = (chatId) => {
    if (appState.activeChatId === chatId) return; // Do nothing if already active
    appState.activeChatId = chatId;
    saveState();
    renderUI(); // Re-render UI to show new active chat
  };

  /**
   * Deletes a specified chat session.
   * Prompts for confirmation and handles active chat reassignment.
   * @param {string} chatId - The ID of the chat to delete.
   */
  const deleteChat = (chatId) => {
    // Confirm deletion
    if (
      !confirm(
        `Are you sure you want to delete the chat "${appState.chats[chatId].title}"? This cannot be undone.`
      )
    ) {
      return;
    }

    delete appState.chats[chatId]; // Remove chat from state

    // If the deleted chat was the active one, find a new active chat
    if (appState.activeChatId === chatId) {
      const remainingChatIds = Object.keys(appState.chats);
      appState.activeChatId =
        remainingChatIds.length > 0 ? remainingChatIds[0] : null; // Set to first remaining or null
    }

    // If no chats are left, create a new default one
    if (!appState.activeChatId) {
      createNewChat();
    } else {
      saveState();
      renderUI(); // Update UI after deletion
    }
  };

  // --- Message Handling Functions ---

  /**
   * Renders a single message object to the chat box.
   * Applies Tailwind CSS classes and adds copy buttons for bot messages and code blocks.
   * @param {object} message - { role: 'user' | 'bot', content: string }
   */
  const renderMessage = (message) => {
    const messageWrapper = document.createElement("div");
    messageWrapper.className = "flex flex-col relative group"; // 'group' for hover effects

    const messageElement = document.createElement("div");
    let baseClasses = "max-w-[85%] p-4 rounded-xl break-words";

    if (message.role === "bot") {
      messageElement.className = `${baseClasses} bg-gray-700 text-gray-200 self-start`;
      // marked.js is configured globally at the top of the script
      messageElement.innerHTML = marked.parse(message.content);
      processCodeBlocks(messageElement); // Highlight code and add copy buttons for code

      // Add "Copy Reply" button for the entire bot message
      const copyReplyButton = document.createElement("button");
      copyReplyButton.title = "Copy entire reply";
      copyReplyButton.className =
        "absolute -bottom-2 -right-2 p-1.5 bg-gray-600 text-gray-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-gray-500";
      copyReplyButton.innerHTML = COPY_ICON_SVG;
      copyReplyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(message.content).then(() => {
          copyReplyButton.innerHTML = CHECK_ICON_SVG;
          setTimeout(() => {
            copyReplyButton.innerHTML = COPY_ICON_SVG;
          }, 2000);
        });
      });

      messageWrapper.appendChild(messageElement);
      messageWrapper.appendChild(copyReplyButton);
    } else {
      messageElement.className = `${baseClasses} bg-blue-600 text-white self-end`;
      messageElement.textContent = message.content; // Use textContent for user messages for security
      messageWrapper.appendChild(messageElement);
    }
    chatBox.appendChild(messageWrapper);
  };

  /**
   * Finds code blocks within an element, highlights them, and adds a copy button.
   * @param {HTMLElement} element - The parent element to search for code blocks.
   */
  const processCodeBlocks = (element) => {
    element.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightElement(block); // Highlight the code
      const preElement = block.parentElement; // 'pre' is the parent of 'code'
      preElement.classList.add("relative"); // Make 'pre' relative for absolute positioning of the button

      const copyCodeButton = document.createElement("button");
      copyCodeButton.className =
        "copy-btn absolute top-2 right-2 bg-gray-600 hover:bg-gray-500 text-white text-xs font-semibold py-1 px-2 rounded-md transition-colors";
      copyCodeButton.textContent = "Copy";
      preElement.appendChild(copyCodeButton);

      copyCodeButton.addEventListener("click", () => {
        navigator.clipboard.writeText(block.innerText).then(() => {
          copyCodeButton.textContent = "Copied!";
          setTimeout(() => {
            copyCodeButton.textContent = "Copy";
          }, 2000);
        });
      });
    });
  };

  /**
   * Scrolls the chat box to the very bottom.
   */
  const scrollToBottom = () => {
    chatBox.scrollTop = chatBox.scrollHeight;
  };

  /**
   * Displays a temporary loading indicator message.
   */
  const showLoadingIndicator = () => {
    const loadingElement = document.createElement("div");
    loadingElement.className =
      "message bot-message self-start loading-indicator";
    loadingElement.innerHTML = `<div class="p-4 bg-gray-700 rounded-xl flex items-center space-x-2"><span class="block w-3 h-3 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span><span class="block w-3 h-3 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span><span class="block w-3 h-3 bg-gray-400 rounded-full animate-bounce"></span></div>`;
    chatBox.appendChild(loadingElement);
    scrollToBottom();
  };

  /**
   * Removes the loading indicator message.
   */
  const hideLoadingIndicator = () => {
    const loadingElement = chatBox.querySelector(".loading-indicator");
    if (loadingElement) loadingElement.remove();
  };

  /**
   * Handles the form submission: sends user message, gets AI response, and updates UI.
   * @param {Event} e - The form submission event.
   */
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const userText = userInput.value.trim();
    if (!userText || !appState.activeChatId) return; // Do nothing if input is empty or no active chat

    const activeChat = appState.chats[appState.activeChatId];
    const userMessage = { role: "user", content: userText };
    activeChat.messages.push(userMessage);

    // Auto-rename chat if it's the first user message in this chat
    const hasPriorUserMessages =
      activeChat.messages.filter((m) => m.role === "user").length > 0;
    if (!hasPriorUserMessages) {
      // This will be the first user message
      activeChat.title =
        userText.substring(0, 30) + (userText.length > 30 ? "..." : "");
      renderChatList(); // Update the sidebar list to show the new title
    }

    activeChat.lastModified = Date.now(); // Update last modified timestamp
    renderMessage(userMessage); // Render user's message immediately
    saveState(); // Save state after user message

    userInput.value = ""; // Clear input
    userInput.style.height = "52px"; // Reset input height
    scrollToBottom();
    showLoadingIndicator();

    try {
      const response = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      hideLoadingIndicator(); // Hide loading indicator as soon as response is received
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
        activeChat.messages.push(botMessage);
        renderMessage(botMessage); // Render bot's message
        saveState(); // Save state after bot message
      } else {
        throw new Error("Received an empty response from the AI.");
      }
    } catch (error) {
      hideLoadingIndicator();
      const errorMessage = {
        role: "bot",
        content: `❌ **Error:** ${error.message}`,
      };
      renderMessage(errorMessage); // Display error message to user
    } finally {
      scrollToBottom(); // Always scroll to bottom after interaction
    }
  };

  // --- Event Listeners ---
  chatForm.addEventListener("submit", handleFormSubmit);
  newChatBtn.addEventListener("click", createNewChat);
  userInput.addEventListener("input", () => {
    userInput.style.height = "auto"; // Reset height to recalculate
    userInput.style.height = `${userInput.scrollHeight}px`; // Set height based on content
  });
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // Enter key without Shift for submission
      e.preventDefault(); // Prevent new line in textarea
      chatForm.dispatchEvent(new Event("submit")); // Trigger form submission
    }
  });

  // --- Initialisation ---
  loadState(); // Load the application state when the DOM is ready
});
