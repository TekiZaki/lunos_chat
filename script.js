$(() => {
  // Use jQuery's document ready shorthand
  // --- DOM Elements (jQuery Objects) ---
  const $chatBox = $("#chat-box");
  const $chatForm = $("#chat-form");
  const $userInput = $("#user-input");
  const $sendBtn = $("#send-btn");
  const $newChatBtn = $("#new-chat-btn");
  const $chatList = $("#chat-list");
  const $chatTitle = $("#chat-title");
  const $chatHeader = $("#chat-header");
  const $sidebar = $("#sidebar");
  const $menuBtn = $("#menu-btn");
  const $sidebarOverlay = $("#sidebar-overlay");

  // --- Configuration ---
  const PROXY_URL = "http://localhost/lunos_api/lunos_v2/proxy.php"; // Assuming it's in the same directory
  const APP_STATE_KEY = "aiChatBotProState";
  const SYSTEM_PROMPT =
    "You are a helpful and friendly assistant. Provide concise and helpful answers, formatting your responses in Markdown. For code, use appropriate language identifiers in code fences.";

  // --- SVG Icons for Buttons ---
  const icons = {
    copy: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>`,
    trash: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>`,
    regenerate: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.18-3.185m-7.524 0h4.992v4.992M2.985 4.356h4.992m0 0v4.992m0-4.992L6.166 7.53a8.25 8.25 0 000 11.664l3.18 3.185" /></svg>`,
    export: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>`,
    edit: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>`,
  };

  // --- LIBRARY CONFIGURATION ---
  marked.setOptions({ breaks: true, gfm: true, sanitize: false }); // Allow HTML from marked
  hljs.configure({ ignoreUnescapedHTML: true });

  // --- Application State ---
  let appState = {
    activeChatId: null,
    chats: {}, // { id: { title, messages: [{ role, content, timestamp }], lastModified } }
  };

  // --- State Management Functions ---
  const saveState = () =>
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(appState));

  const loadState = () => {
    try {
      const savedState = localStorage.getItem(APP_STATE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        // Basic validation for loaded state structure
        if (
          parsedState &&
          typeof parsedState === "object" &&
          parsedState.chats &&
          typeof parsedState.chats === "object"
        ) {
          appState = parsedState;
          const chatIds = Object.keys(appState.chats);
          if (
            !appState.activeChatId ||
            !appState.chats[appState.activeChatId]
          ) {
            appState.activeChatId = chatIds.length > 0 ? chatIds[0] : null;
          }
        } else {
          console.warn("Corrupted state, resetting appState.");
          appState = { activeChatId: null, chats: {} };
        }
      }
    } catch (e) {
      console.error("Error loading state from localStorage:", e);
      appState = { activeChatId: null, chats: {} }; // Reset to default
    }

    if (!appState.activeChatId || Object.keys(appState.chats).length === 0) {
      createNewChat("Welcome Chat"); // Create a default chat
    } else {
      renderUI();
    }
  };

  // --- UI Rendering Functions ---
  const renderUI = () => {
    renderChatList();
    renderActiveChat();
    addExportButton();
    // Close sidebar on mobile after rendering, if it was open
    closeSidebar();
  };

  const renderChatList = () => {
    $chatList.empty();
    const sortedChats = Object.values(appState.chats).sort(
      (a, b) => b.lastModified - a.lastModified
    );
    sortedChats.forEach((chat) => {
      const isActive = chat.id === appState.activeChatId;
      // Sanitize chat title for display
      const displayTitle = $("<div>").text(chat.title).html();
      const $chatItem = $(`
            <div class="chat-item-container flex justify-between items-center p-2 rounded-lg cursor-pointer group ${
              isActive
                ? "bg-blue-500/50 text-white"
                : "hover:bg-gray-700/50 text-gray-300"
            }" data-id="${chat.id}">
                <span class="truncate text-sm">${displayTitle}</span>
                <button class="delete-chat-btn text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Chat">
                    ${icons.trash}
                </button>
            </div>
        `);
      $chatList.append($chatItem);
    });
  };

  const renderActiveChat = () => {
    const activeChat = appState.chats[appState.activeChatId];
    $chatBox.empty();
    if (activeChat) {
      // Sanitize chat title
      $chatTitle.text($("<div>").text(activeChat.title).text());
      // Skip system prompt (index 0) when rendering
      activeChat.messages.slice(1).forEach((msg, index) =>
        renderMessage(
          msg,
          index + 1, // Adjust index for display purposes
          activeChat.messages.length - 1, // Total renderable messages
          activeChat.id
        )
      );
      $userInput.prop("disabled", false);
      $sendBtn.prop("disabled", false);
    } else {
      $chatTitle.text("No Chat Selected");
      $userInput.prop("disabled", true);
      $sendBtn.prop("disabled", true);
    }
    scrollToBottom();
  };

  // --- Chat Action Functions ---
  const createNewChat = (initialTitle = "New Conversation") => {
    const newChatId = `chat-${Date.now()}`;
    appState.chats[newChatId] = {
      id: newChatId,
      title: initialTitle,
      messages: [{ role: "system", content: SYSTEM_PROMPT }],
      lastModified: Date.now(),
    };
    appState.activeChatId = newChatId;
    saveState();
    renderUI();
  };

  const switchChat = (chatId) => {
    if (appState.activeChatId === chatId) return;
    appState.activeChatId = chatId;
    saveState();
    renderUI();
  };

  const deleteChat = (chatId) => {
    if (
      !confirm(
        `Are you sure you want to delete the chat "${appState.chats[chatId].title}"? This cannot be undone.`
      )
    )
      return;

    delete appState.chats[chatId];
    const remainingChatIds = Object.keys(appState.chats).sort(
      (a, b) => appState.chats[b].lastModified - appState.chats[a].lastModified
    );

    if (remainingChatIds.length > 0) {
      appState.activeChatId = remainingChatIds[0];
    } else {
      // If no chats left, create a new one
      createNewChat();
      return; // Exit to avoid double renderUI
    }

    saveState();
    renderUI();
  };

  // --- Message Handling Functions ---
  const renderMessage = (message, index, totalMessages, chatId) => {
    const isUser = message.role === "user";
    const $messageWrapper = $(
      `<div class="flex flex-col relative group ${
        isUser ? "items-end" : "items-start"
      }" data-msg-index="${index}" data-chat-id="${chatId}"></div>`
    );

    const $messageElement = $(
      `<div class="max-w-[85%] sm:max-w-[75%] p-3 sm:p-4 rounded-xl break-words message-content ${
        isUser
          ? "bg-blue-600 text-white self-end"
          : "bg-gray-700 text-gray-200 self-start"
      }"></div>`
    );

    if (isUser) {
      // Use .text() for user input to prevent XSS
      $messageElement.text(message.content);
    } else {
      // Marked handles sanitization by default, but we configured sanitize:false
      // Ensure content is safe if coming from external source.
      // Here, it's assumed to be coming from the trusted AI proxy.
      $messageElement.html(marked.parse(message.content));
      processCodeBlocks($messageElement);
    }
    $messageWrapper.append($messageElement);

    // -- Controls --
    // Controls are always visible on small screens due to CSS override
    const isLastMessage = index === totalMessages; // Check against total renderable messages
    const $controlsWrapper = $(
      '<div class="absolute -bottom-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 message-controls"></div>'
    ).css(isUser ? { left: "-0.5rem" } : { right: "-0.5rem" });

    if (isUser) {
      $controlsWrapper.append(
        createControlButton(icons.edit, "Edit & Regenerate", "edit-msg-btn")
      );
    } else {
      $controlsWrapper.append(
        createControlButton(icons.copy, "Copy entire reply", "copy-reply-btn")
      );
      if (isLastMessage) {
        $controlsWrapper.append(
          createControlButton(
            icons.regenerate,
            "Regenerate response",
            "regen-btn"
          )
        );
      }
    }
    $messageWrapper.append($controlsWrapper);

    // -- Timestamp --
    if (message.timestamp) {
      const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const $timeElement = $(
        `<span class="text-xs text-gray-500 mt-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity md:group-hover:opacity-100">${time}</span>`
      );
      $messageWrapper.append($timeElement);
    }

    $chatBox.append($messageWrapper);
  };

  const processCodeBlocks = ($element) => {
    $element.find("pre code").each(function () {
      const $block = $(this);
      hljs.highlightElement($block[0]);
      const $preElement = $block.parent();
      $preElement.addClass("relative");
      const $copyCodeButton = $(
        `<button class="copy-code-btn absolute top-2 right-2 bg-gray-600 hover:bg-gray-500 text-white text-xs font-semibold py-1 px-2 rounded-md transition-colors">Copy</button>`
      );
      $preElement.append($copyCodeButton);
    });
  };

  // --- Utility Functions ---
  const scrollToBottom = () => $chatBox.scrollTop($chatBox[0].scrollHeight);

  const copyToClipboard = (text, $button, originalIcon) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        $button.html(icons.check);
        setTimeout(() => $button.html(originalIcon), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text:", err);
        alert("Failed to copy text. Please try again.");
      });
  };

  const createControlButton = (svg, title, className) =>
    `<button title="${title}" class="${className} p-1.5 bg-gray-600 text-gray-300 rounded-full hover:bg-gray-500">${svg}</button>`;

  // --- Loading Indicators ---
  const showLoadingIndicator = () => {
    const $loadingElement = $(
      `<div class="message bot-message self-start loading-indicator"><div class="p-4 bg-gray-700 rounded-xl flex items-center space-x-2"><span class="block w-3 h-3 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span><span class="block w-3 h-3 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span><span class="block w-3 h-3 bg-gray-400 rounded-full animate-bounce"></span></div></div>`
    );
    $chatBox.append($loadingElement);
    scrollToBottom();
  };
  const hideLoadingIndicator = () => $(".loading-indicator").remove();

  // --- Core API & Form Logic ---
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const userText = $userInput.val().trim();
    if (!userText || !appState.activeChatId) return;

    // Disable input and button while fetching
    $userInput.prop("disabled", true);
    $sendBtn.prop("disabled", true);

    const activeChat = appState.chats[appState.activeChatId];
    const isFirstUserMessageInChat =
      activeChat.messages.filter((m) => m.role === "user").length === 0;

    addMessageToChat("user", userText);
    if (isFirstUserMessageInChat) {
      activeChat.title =
        userText.substring(0, 30) + (userText.length > 30 ? "..." : "");
      renderChatList(); // Update title in sidebar
    }

    renderActiveChat();
    $userInput.val("").css("height", "52px"); // Reset textarea height

    fetchAIResponse();
  };

  const fetchAIResponse = () => {
    showLoadingIndicator();
    const activeChat = appState.chats[appState.activeChatId];
    const messagesToSend = activeChat.messages; // Send the whole history

    $.ajax({
      url: PROXY_URL,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ messages: messagesToSend }),
    })
      .done((data) => {
        const botContent = data.choices?.[0]?.message?.content;
        if (botContent) {
          addMessageToChat("assistant", botContent.trim());
        } else {
          addMessageToChat(
            "assistant",
            `❌ **Error:** Received an empty or malformed response from the AI.`
          );
        }
      })
      .fail((jqXHR) => {
        let errorMsg = "An unknown network error occurred.";
        try {
          const errorResponse = jqXHR.responseJSON;
          errorMsg = errorResponse?.error?.message || errorMsg;
        } catch (e) {
          // If responseJSON parsing fails, use statusText or generic message
          errorMsg = jqXHR.statusText || errorMsg;
        }
        addMessageToChat("assistant", `❌ **Error:** ${errorMsg}`);
      })
      .always(() => {
        hideLoadingIndicator();
        renderActiveChat();
        saveState();
        scrollToBottom();
        // Re-enable input and button
        $userInput.prop("disabled", false);
        $sendBtn.prop("disabled", false);
        $userInput.focus(); // Focus on input after response
      });
  };

  const addMessageToChat = (role, content) => {
    const activeChat = appState.chats[appState.activeChatId];
    if (!activeChat) return;

    // The proxy expects 'assistant' for the bot's role
    const messageRole = role === "bot" ? "assistant" : role;

    activeChat.messages.push({
      role: messageRole,
      content: content,
      timestamp: Date.now(),
    });
    activeChat.lastModified = Date.now();
    saveState();
  };

  // --- New Feature Handlers ---
  const handleRegenerate = () => {
    const activeChat = appState.chats[appState.activeChatId];
    if (!activeChat || activeChat.messages.length < 2) return; // Need at least system + user message

    // Find the last assistant message and remove it
    const lastMessage = activeChat.messages[activeChat.messages.length - 1];
    if (lastMessage.role === "assistant") {
      activeChat.messages.pop(); // Remove the last AI response
    } else if (lastMessage.role === "user") {
      // If the last message is from the user, it means the previous AI response
      // was already removed or never existed, and the user just sent a new query.
      // In this case, we just proceed to fetch AI response for the current context.
      // No need to remove the user message here.
    }

    renderActiveChat(); // Re-render chat to show state before regeneration
    fetchAIResponse();
  };

  const handleEdit = ($btn) => {
    const $wrapper = $btn.closest("[data-msg-index]");
    // We store 'display index' in data-msg-index. Convert to actual array index.
    const displayMsgIndex = parseInt($wrapper.data("msg-index"));
    // Real message index: 0 is system prompt, so displayMsgIndex (1-based) corresponds to array index (1-based)
    const realMsgIndex = displayMsgIndex;

    const chatId = $wrapper.data("chat-id");
    const chat = appState.chats[chatId];
    if (!chat || !chat.messages[realMsgIndex]) return;

    const originalMessage = chat.messages[realMsgIndex];
    const $messageElement = $wrapper.children(".message-content"); // Select the actual content div

    // Hide existing message and controls
    $messageElement.hide();
    $wrapper.find(".message-controls").hide();

    const $editArea = $(`
        <div class="w-full flex flex-col items-end gap-2 p-2 rounded-xl bg-gray-700 text-gray-200">
            <textarea class="w-full bg-gray-800 text-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base">${originalMessage.content}</textarea>
            <div class="flex gap-2">
                <button class="save-edit-btn bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-1 px-3 rounded-md">Save & Submit</button>
                <button class="cancel-edit-btn bg-gray-600 hover:bg-gray-500 text-white text-sm font-semibold py-1 px-3 rounded-md">Cancel</button>
            </div>
        </div>
    `);

    $wrapper.append($editArea);
    $editArea.find("textarea").focus(); // Focus the textarea

    $editArea.find(".save-edit-btn").on("click", () => {
      const newContent = $editArea.find("textarea").val().trim();
      if (newContent && newContent !== originalMessage.content) {
        // Update message content
        chat.messages[realMsgIndex].content = newContent;
        chat.messages[realMsgIndex].timestamp = Date.now(); // Update timestamp for edit
        // Truncate history after this edited message (inclusive)
        chat.messages.splice(realMsgIndex + 1);
        chat.lastModified = Date.now();
        saveState();
        renderActiveChat(); // Re-render the updated chat history
        fetchAIResponse(); // Fetch new response from the edited point
      } else {
        // If content is same or empty, just cancel
        $editArea.remove();
        $messageElement.show();
        $wrapper.find(".message-controls").show();
      }
    });

    $editArea.find(".cancel-edit-btn").on("click", () => {
      $editArea.remove();
      $messageElement.show();
      $wrapper.find(".message-controls").show();
    });
  };

  const exportChatToMarkdown = () => {
    const activeChat = appState.chats[appState.activeChatId];
    if (!activeChat || activeChat.messages.length <= 1) {
      alert("Nothing to export! Start a conversation first.");
      return;
    }

    let markdownContent = `# ${activeChat.title}\n\n`;
    activeChat.messages.slice(1).forEach((msg) => {
      // Use .text() to escape potentially harmful content from AI before re-exporting.
      // This prevents issues if the AI somehow generated unescaped HTML that was rendered by marked.
      const sanitizedContent = $("<div>").text(msg.content).text();
      const prefix = msg.role === "user" ? "**You:**" : "**AI:**";
      const time = new Date(msg.timestamp).toLocaleString();
      markdownContent += `*Sent: ${time}*\n`;
      markdownContent += `${prefix}\n${sanitizedContent}\n\n---\n\n`;
    });

    try {
      const blob = new Blob([markdownContent], {
        type: "text/markdown;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Sanitize filename
      const filename = `${activeChat.title
        .replace(/[^\w\s-]/gi, "")
        .replace(/\s+/g, "_")
        .toLowerCase()}.md`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error exporting chat:", e);
      alert(
        "Could not export chat. Your browser might not support this feature, or there was an error."
      );
    }
  };

  const addExportButton = () => {
    // Remove existing button if any to prevent duplicates on re-render
    $("#export-chat-btn").remove();
    const $exportBtn = $(
      `<button id="export-chat-btn" class="text-gray-400 hover:text-white transition-colors ml-auto" title="Export Chat to Markdown">${icons.export}</button>`
    );
    $chatHeader.append($exportBtn);
  };

  // --- Mobile UI Handlers ---
  const openSidebar = () => {
    $sidebar.addClass("open");
    $sidebarOverlay.removeClass("hidden");
  };

  const closeSidebar = () => {
    $sidebar.removeClass("open");
    $sidebarOverlay.addClass("hidden");
  };

  // --- Event Listeners (using jQuery) ---
  $chatForm.on("submit", handleFormSubmit);
  $newChatBtn.on("click", createNewChat);

  $userInput
    .on("input", function () {
      this.style.height = "auto";
      this.style.height = `${this.scrollHeight}px`;
    })
    .on("keydown", (e) => {
      // Prevent submitting with Shift+Enter
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        $chatForm.trigger("submit");
      }
    });

  // Delegated events for dynamic elements
  $chatList
    .on("click", ".chat-item-container", function () {
      switchChat($(this).data("id"));
    })
    .on("click", ".delete-chat-btn", function (e) {
      e.stopPropagation(); // Prevent switchChat from firing
      deleteChat($(this).closest(".chat-item-container").data("id"));
    });

  $chatHeader.on("click", "#export-chat-btn", exportChatToMarkdown);
  $menuBtn.on("click", openSidebar);
  $sidebarOverlay.on("click", closeSidebar);

  $chatBox
    .on("click", ".copy-code-btn", function () {
      const $btn = $(this);
      const code = $btn.siblings("code").text();
      // Temporarily change button text for feedback
      $btn.text("Copied!");
      setTimeout(() => $btn.text("Copy"), 2000);
      copyToClipboard(code, $btn, "Copy"); // Pass original text "Copy"
    })
    .on("click", ".copy-reply-btn", function () {
      const $btn = $(this);
      const msgIndex = parseInt(
        $btn.closest("[data-msg-index]").data("msg-index")
      );
      // Adjust index to get actual message from array (skip system prompt)
      const messageContent =
        appState.chats[appState.activeChatId].messages[msgIndex].content;
      copyToClipboard(messageContent, $btn, icons.copy);
    })
    .on("click", ".regen-btn", handleRegenerate)
    .on("click", ".edit-msg-btn", function () {
      handleEdit($(this));
    });

  // --- Initialisation ---
  loadState();
});
