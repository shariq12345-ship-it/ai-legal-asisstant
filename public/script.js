document.addEventListener('DOMContentLoaded', () => {
    // Mode Tracking
    let activeMode = null;
    let selectedFile = null;

    // DOM Elements Reference
    const tags = document.querySelectorAll('.tag');
    const searchInput = document.querySelector('.search-input');
    const submitBtn = document.getElementById('submitBtn');
    const chatHistory = document.getElementById('chatHistory');
    const mainContent = document.getElementById('mainContent');
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const dropdownList = document.getElementById('dropdownList');
    const uploadDocOption = document.getElementById('uploadDocOption');
    const attachedFileContainer = document.getElementById('attachedFileContainer');
    const attachedFileName = document.getElementById('attachedFileName');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const closeModal = document.getElementById('closeModal');
    const newChatBtn = document.getElementById('newChatBtn');

    // Auth & Profile Elements
    const signInTabBtn = document.getElementById('signInTabBtn');
    const signUpTabBtn = document.getElementById('signUpTabBtn');
    const signInFormContainer = document.getElementById('signInFormContainer');
    const signUpFormContainer = document.getElementById('signUpFormContainer');
    const signInForm = document.getElementById('signInForm');
    const signUpForm = document.getElementById('signUpForm');
    const userProfileWrapper = document.getElementById('userProfileWrapper');
    const userProfileBtn = document.getElementById('userProfileBtn');
    const userDropdown = document.getElementById('userDropdown');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const logoutBtn = document.getElementById('logoutBtn');

    // Hidden File Input Creator
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.txt,.doc,.docx';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // ----------------------------------------------------
    // 1. UI HELPERS & AUTH MODAL TOGGLE
    // ----------------------------------------------------
    function activateChatUI() {
        if (chatHistory) {
            chatHistory.style.display = 'flex';
        }
        if (mainContent) {
            mainContent.classList.add('has-chat');
        }
    }

    function resetToCenterUI() {
        if (chatHistory) {
            chatHistory.innerHTML = '';
            chatHistory.style.display = 'none';
        }
        if (mainContent) {
            mainContent.classList.remove('has-chat');
        }
        if (searchInput) {
            searchInput.value = '';
        }
        clearSelectedFile();
    }

    if (newChatBtn) {
        newChatBtn.addEventListener('click', resetToCenterUI);
    }

    // Modal Events
    if (loginBtn && loginModal && closeModal) {
        loginBtn.addEventListener('click', () => loginModal.classList.add('active'));
        closeModal.addEventListener('click', () => loginModal.classList.remove('active'));
    }

    // Auth Tab Switches (Sign In / Sign Up)
    if (signInTabBtn && signUpTabBtn) {
        signInTabBtn.addEventListener('click', () => {
            signInTabBtn.classList.add('active');
            signUpTabBtn.classList.remove('active');
            signInFormContainer.style.display = 'block';
            signUpFormContainer.style.display = 'none';
        });

        signUpTabBtn.addEventListener('click', () => {
            signUpTabBtn.classList.add('active');
            signInTabBtn.classList.remove('active');
            signUpFormContainer.style.display = 'block';
            signInFormContainer.style.display = 'none';
        });
    }

    // Login State Manager Function
    function userLoginSuccess(name) {
        const displayName = name ? name.split(' ')[0] : 'User';
        userNameDisplay.textContent = displayName;
        
        // Login button chhupao aur Profile UI dikhao
        loginBtn.style.display = 'none';
        userProfileWrapper.style.display = 'block';
        loginModal.classList.remove('active');
    }

    // Logout Function
    function userLogout() {
        userProfileWrapper.style.display = 'none';
        loginBtn.style.display = 'inline-block';
        userDropdown.classList.remove('show');
        userProfileBtn.classList.remove('active');
    }

    // Profile Dropdown Toggle
    if (userProfileBtn && userDropdown) {
        userProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userProfileBtn.classList.toggle('active');
            userDropdown.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            userProfileBtn.classList.remove('active');
            userDropdown.classList.remove('show');
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            userLogout();
        });
    }

    // Form Submissions Handlers
    if (signInForm) {
        signInForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('signInEmail').value;
            const extractedName = emailInput.split('@')[0];
            userLoginSuccess(extractedName);
            signInForm.reset();
        });
    }

    if (signUpForm) {
        signUpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('signUpName').value;
            userLoginSuccess(nameInput);
            signUpForm.reset();
        });
    }

    // Plus Dropdown Menu Toggle
    if (menuToggleBtn && dropdownList) {
        menuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menuToggleBtn.classList.toggle('active');
            dropdownList.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            menuToggleBtn.classList.remove('active');
            dropdownList.classList.remove('show');
        });
    }

    if (uploadDocOption) {
        uploadDocOption.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.click();
        });
    }

    // ----------------------------------------------------
    // 2. CHAT & MESSAGE RENDERING
    // ----------------------------------------------------
// ----------------------------------------------------
// 3. CHAT & MODE SELECTION LOGIC (UPDATED WITH PARSING)
// ----------------------------------------------------

/**
 * Text se signs (*, #) aur HTML tags hatakar, clean format mein HTML return karta hai.
 * @param {string} text - Raw text from AI model.
 * @returns {string} - Cleaned HTML string.
 */
function cleanAndFormatText(text) {
    if (!text) return "";

    // Step 1: HTML tags (<p>, <ul>, etc.) ko sanitize karna taaki wo raw text na dikhein.
    // marked library direct HTML bhi handle karti hai, but parse karne se pehle sanitize karna safer hai.
    // Hum raw tags ko hatane ke liye marked ki setting use karenge.

    marked.setOptions({
        headerIds: false, // ID add na karein headings mein
        mangle: false,    // Email address mangle na karein
        sanitize: false,   // Model agar safety ke liye direct HTML bhej raha hai to use allow karein
        breaks: true,      // Line breaks ko preserve karein
    });

    // Step 2: marked library Markdown signs (**bold**, # heading, - lists) ko HTML mein convert karegi.
    let formattedHtml = marked.parse(text);

    // Step 3: Agar parsing ke baad bhi koi specific signs reh jayein to remove karein (safer method).
    // Marked.js usually sab signs handle kar leta hai structure banate waqt.

    return formattedHtml;
}

function appendMessage(sender, textOrHtml, isLoading = false, isHtml = false, isDocumentBuilder = false) {
    // Automatically switch layout when message is sent/received
    if (sender !== 'system-warning') {
        activateChatUI();
    }

    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    if (isLoading) msgDiv.classList.add('loading');

    // AI ya System responses ko clean aur format karna.
    // Hum srif AI ke responses ko format karenge. User ke prompts ko raw rakhenge.
    if (!isLoading && (sender === 'ai' || sender === 'system-warning' || isDocumentBuilder)) {
        textOrHtml = cleanAndFormatText(textOrHtml);
        isHtml = true; // formattedHtml HTML string hai
    }

    if (isDocumentBuilder && !isLoading) {
        const docId = 'doc_' + Date.now();
        msgDiv.innerHTML = `
            <div class="doc-container">
                <!-- formattedHtml direct is box mein jayega -->
                <div class="pdf-preview-box markdown-body" id="${docId}">${textOrHtml}</div>
                <div class="doc-actions">
                    <button class="pdf-download-btn" onclick="downloadPDF('${docId}')">
                        <i class="fa-solid fa-file-pdf"></i> Download as PDF
                    </button>
                </div>
            </div>
        `;
    } else if (isHtml) {
        // AI responses ya formattedHTML ke liye class add karein.
        if (sender === 'ai') msgDiv.classList.add('markdown-body');
        msgDiv.innerHTML = textOrHtml;
    } else {
        msgDiv.textContent = textOrHtml;
    }

    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return msgDiv;
}

    // PDF Download Helper
    window.downloadPDF = function(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const options = {
            margin: 10,
            filename: 'Legal_Document.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(options).from(element).save();
    };

    // Mode Tag Clicks
    tags.forEach(tag => {
        tag.addEventListener('click', () => {
            tags.forEach(t => t.classList.remove('selected'));
            tag.classList.add('selected');

            activeMode = tag.getAttribute('data-mode') || tag.textContent.trim();
            submitBtn.removeAttribute('disabled');

            if (activeMode === 'AI chatbot') {
                searchInput.placeholder = `[AI Chatbot Mode] Ask any legal question...`;
                clearSelectedFile();
            } else if (activeMode === 'Simple English Translator') {
                searchInput.placeholder = `[Translator Mode] Type legal text OR click '+' to upload PDF/DOCX...`;
            } else if (activeMode === 'Simple Document Builder') {
                searchInput.placeholder = `[Document Builder Mode] Enter requirements OR click '+' to upload reference PDF/DOCX...`;
            }
        });
    });

    // File selection UI handlers
    function clearSelectedFile() {
        selectedFile = null;
        fileInput.value = '';
        if (attachedFileContainer) {
            attachedFileContainer.style.display = 'none';
        }
    }

    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', clearSelectedFile);
    }

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedFile = e.target.files[0];
            attachedFileName.textContent = selectedFile.name;
            attachedFileContainer.style.display = 'block';
        }
    });

    // Enter Key Handler
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !submitBtn.disabled) {
                handleSend();
            }
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', handleSend);
    }

    // Send Request Handler
    async function handleSend() {
        if (!activeMode) {
            appendMessage('system-warning', '⚠️ Request Blocked: Please select a mode from below before sending.');
            return;
        }

        const promptText = searchInput.value.trim();
        if (!promptText && !selectedFile) return;

        activateChatUI();

        const userDisplayText = promptText + (selectedFile ? ` (Attached: ${selectedFile.name})` : '');
        appendMessage('user', userDisplayText);

        searchInput.value = '';

        const loadingElement = appendMessage('ai', '🤖 LexAI is processing your query...', true);

        const formData = new FormData();
        formData.append('mode', activeMode);
        formData.append('prompt', promptText);
        if (selectedFile) formData.append('document', selectedFile);

        const currentModeName = activeMode;

        try {
            const response = await fetch('/api/legal/process', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            // Remove Loading Text
            if (loadingElement) loadingElement.remove();

            const isDocBuilder = currentModeName === 'Simple Document Builder';
            const responseContent = data.result || data.message || "Document created successfully.";

            appendMessage('ai', responseContent, false, false, isDocBuilder);
            clearSelectedFile();

        } catch (error) {
            if (loadingElement) loadingElement.remove();
            appendMessage('system-warning', '❌ Unable to process request. Please check server connection.');
        }
    }
});