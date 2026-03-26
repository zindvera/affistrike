
        const WORKER_URL = "https://little-queen-f49a.vineetkum25.workers.dev";
        let affiliateProducts = [];

        async function fetchTools() {
            try {
                const response = await fetch('affiliateData.json');
                if (!response.ok) throw new Error("Failed to load JSON");
                affiliateProducts = await response.json();
            } catch (err) {
                console.error("JSON Load Error:", err);
                showError("Configuration error. Please check your JSON file.");
            }
        }
        fetchTools();


        const words = ["business", "Product", "Service"];
        let wordIndex = 0;
        const rotateEl = document.getElementById('rotating-word');

        setInterval(() => {
            // 1. Start the fade out and slight slide down
            rotateEl.classList.add('fade-hidden');

            setTimeout(() => {
                // 2. Change the word while invisible
                wordIndex = (wordIndex + 1) % words.length;
                rotateEl.innerText = words[wordIndex];

                // 3. Fade back in and slide up to position
                rotateEl.classList.remove('fade-hidden');
            }, 400); // This delay matches the CSS transition time
        }, 2500); // Slightly slower rotation for better readability

        let chatContext = [];

        const animObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-border');
                    animObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        function showError(msg) {
            const toast = document.getElementById('error-toast');
            toast.innerText = msg;
            toast.style.display = 'block';
            setTimeout(() => toast.style.display = 'none', 3500);
        }

        function moveInputToBottom() {
            const main = document.querySelector('main');
            const inputArea = document.getElementById('ui-input-area');
            main.appendChild(inputArea);
        }

        function truncateByWord(text, limit) {
            const wordsArr = text.split(/\s+/);
            if (wordsArr.length <= limit) return text;
            const truncated = wordsArr.slice(0, limit).join(' ');
            const fullId = 'f-' + Math.random().toString(15).substr(2, 9);
            const truncId = 't-' + Math.random().toString(15).substr(2, 9);
            return `<span id="${truncId}">${truncated}</span><span class="dots">...</span><span id="${fullId}" class="hidden">${text}</span><button class="read-more-btn" onclick="toggleReadMore('${truncId}', '${fullId}', this)">Read more</button>`;
        }

        window.toggleReadMore = (truncId, fullId, btn) => {
            const truncEl = document.getElementById(truncId);
            const fullEl = document.getElementById(fullId);
            const dots = truncEl.nextElementSibling;
            if (fullEl.classList.contains('hidden')) {
                fullEl.classList.remove('hidden');
                truncEl.classList.add('hidden');
                dots.classList.add('hidden');
                btn.innerText = 'Read less';
            } else {
                fullEl.classList.add('hidden');
                truncEl.classList.remove('hidden');
                dots.classList.remove('hidden');
                btn.innerText = 'Read more';
            }
        };

        window.startValidation = () => {
            if (affiliateProducts.length === 0) {
                showError("Data still loading, please try again in a moment.");
                return;
            }
            const val = document.getElementById('ideaInput').value.trim();
            if (val.length < 5) return;
            handleQuery(val, "VALIDATE");
        };

        window.triggerImprovement = (btn) => {
            if (btn) {
                btn.disabled = true;
                btn.innerText = "✨ Improving...";
                btn.classList.remove('animate-border');
            }
            handleQuery(`[IMPROVE_REQUEST]`, "IMPROVE");
        };


        function getSystemPrompt(mode) {
            const toolList = affiliateProducts.map(p => `- ${p.name}: ${p.about} [URL: ${p.affiliate_url}]`).join('\n');

            
            if (mode === "VALIDATE") {
                return `Respond ONLY in valid JSON. You are an expert Business Architect. Evaluate the business idea. 
                STRICT JUSTIFICATION RULES:
            1. PROBLEM SCORE: Evaluate ONLY the "Customer Pain Point" (the gap in the market or user need). DO NOT mention business hurdles like operational costs, staffing, or regulations. 
            2. DEEP JUSTIFICATION: Every "desc" MUST provide a logical "because" by citing specific details from the user's description. Max 40 words.
            3. MANDATORY KEYS: Use these exact keys: "score", "label", "desc".
                Structure:
        {
            "status": "OK" or "UNCLEAR",
            "problem": { "score": "X/10", "label": "Bad" | "Average" | "Good" | "Very Good" | "Excellent", "desc": "Approx 40 words." },
            "concept": { "score": "X/10", "label": "Bad" | "Average" | "Good" | "Very Good" | "Excellent", "desc": "Approx 40 words." },
            "final": { "score": "X%", "label": "Avoid" | "You can Try" | "Yes Absolutely", "desc": "Approx 40 words final verdict." }
        }`;
            } else {
                return `Respond ONLY in valid JSON. Suggest strategic improvements for the business idea.
    
    STRICT CATEGORY TEMPLATE (Titles must be exact):
    1. "Features or Benefits Addon": Tactical advice.
    2. "Free Marketing": Strategic advice only.
    3. "Paid Marketing": Strategic advice only. 
    4. "Tools Which Can Help": Tool-specific recommendations.

    CRITICAL CONTENT RULES:
    - CATEGORY 1, 2, 3: Provide exactly 1 to 4 high-impact suggestions per category.
    - CATEGORY 4 MANDATE (Tools): You MUST use the Markdown format [Tool Name](URL) followed by a COLON (:).
    - Example: "[Shopify](https://www.shopify.com/) : Use this to build your store for your cloth business."
    - NEVER write Tool Name (URL). ALWAYS use [Tool Name](URL).
    - Place url only from AVAILABLE TOOLS affiliate_url if tool is recommended from this AVAILABLE TOOLS json. And if tool is recommended which is not present in AVAILABLE TOOLS then use its own official page url.  
    - Suggest Tools Upto Max 10 tools required for **[operation or marketing or setup]** in business idea. For example - If only 7 tools from AVAILABLE TOOLS is required for **[operation or marketing or setup]** of business based on input idea then suggest only 7 tools. If found 2 tools that fit into business idea to help in setup or operate or marketing then suggest 2 tools.
    - **Write description of how this tool can help you in your this user input business idea**.   

    AVAILABLE TOOLS:
    ${toolList}
    
    Required JSON Structure:
    {
        "tips": [
            { "title": "Features or Benefits Addon", "bullets": ["..."] },
            { "title": "Free Marketing", "bullets": ["..."] },
            { "title": "Paid Marketing", "bullets": ["..."] },
            { "title": "Tools Which Can Help", "bullets": ["[Tool Name](URL) : Specific business explanation."] }
        ]
    }`;
            }
        }


        async function handleQuery(text, mode) {
            const loader = document.getElementById('global-loader');
            loader.classList.remove('hidden');

            if (mode !== "IMPROVE") {
                document.getElementById('btn-analyze').disabled = true;
                document.getElementById('chat-phase').classList.remove('hidden');
                appendUserBubble(text);
                document.getElementById('ideaInput').value = "";
                moveInputToBottom();
            }

            chatContext.push({ role: "user", parts: [{ text }] });
            try {
                const sys = getSystemPrompt(mode);
                const res = await fetch(WORKER_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: chatContext, system_instruction: { parts: [{ text: sys }] } })
                });

                if (!res.ok) throw new Error("Worker failed");

                const data = await res.json();
                const aiRaw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

                let cleanJson = aiRaw;
                if (aiRaw.includes("```")) {
                    const match = aiRaw.match(/\{[\s\S]*\}/);
                    if (match) cleanJson = match[0];
                }

                const parsed = JSON.parse(cleanJson);

                loader.classList.add('hidden');
                document.getElementById('btn-analyze').disabled = false;

                if (parsed.status === "UNCLEAR") {
                    appendErrorBubble("Your idea seems a bit too brief. Could you explain what problem you're targeting or how your business works?");
                    chatContext.pop();
                    moveInputToBottom();
                    return;
                }

                renderContent(parsed, mode);
                chatContext.push({ role: "model", parts: [{ text: cleanJson }] });
                moveInputToBottom();
            } catch (e) {
                console.error("Query Error:", e);
                loader.classList.add('hidden');
                document.getElementById('btn-analyze').disabled = false;
                showError("System error. Please try again later.");
            }
        }




        function appendUserBubble(text) {
            const container = document.getElementById('messages-container');
            const bubble = document.createElement('div');
            bubble.className = `chat-bubble bubble-user`;
            bubble.innerText = text;
            container.appendChild(bubble);
        }

        function appendErrorBubble(text) {
            const container = document.getElementById('messages-container');
            const bubble = document.createElement('div');
            bubble.className = `chat-bubble bubble-error`;
            bubble.innerText = text;
            container.appendChild(bubble);
        }





        function renderContent(data, mode) {
            const container = document.getElementById('messages-container');
            const wrap = document.createElement('div');

            if (mode === "VALIDATE") {
                const timestamp = Date.now();

                // --- NEW CONVERSION LOGIC ---
                // Converts "85%" or "85" into "8.5/10" to match Concept & USP UI
                let finalScoreFormatted = data.final.score;
                if (typeof finalScoreFormatted === 'string' && finalScoreFormatted.includes('%')) {
                    let num = parseFloat(finalScoreFormatted.replace('%', ''));
                    finalScoreFormatted = (num / 10).toFixed(1) + "/10";
                } else if (!isNaN(finalScoreFormatted) && finalScoreFormatted > 10) {
                    // If it's a number like 85, convert to 8.5/10
                    finalScoreFormatted = (finalScoreFormatted / 10).toFixed(1) + "/10";
                }

                wrap.innerHTML = `
            <div class="section-card">
                <div class="verdict-box">
                    <span class="score-label">The Problem</span>
                    <span class="score-value">${data.problem.score}</span>
                    <span class="quality-badge">${data.problem.label}</span>
                    <div class="content-text" style="font-weight:500; color:var(--text-muted); line-height:1.77">
                        ${truncateByWord(data.problem.desc, 15)}
                    </div>
                </div>
            </div>

            <div class="section-card">
                <div class="verdict-box">
                    <span class="score-label">Concept & USP</span>
                    <span class="score-value">${data.concept.score}</span>
                    <span class="quality-badge">${data.concept.label}</span>
                    <div class="content-text" style="font-weight:500; color:var(--text-muted); line-height:1.77">
                        ${truncateByWord(data.concept.desc, 15)}
                    </div>
                </div>
            </div>

            <div class="section-card">
                <div class="verdict-box">
                    <span class="score-label">Should You Start</span>
                    
                    <div class="result-row" style="display: flex; align-items: center; gap: 8px; margin-top: 4px; margin-bottom: 12px;">
                        <span class="score-value" style="font-size: 1.5rem; font-weight: 800;">${finalScoreFormatted}</span>
                        
                        <span class="quality-badge" style="background: #f3f4f6; color: #111827; border: 1px solid #f3f4f6;">
                            ${data.final.label}
                        </span>
                    </div>

                    <div class="content-text" style="font-weight:500; color:var(--text-muted); line-height:1.77">
                        ${truncateByWord(data.final.desc, 15)}
                    </div>
                </div>
            </div>

            <div class="badge-container-wrapper">
                <button class="improve-btn" id="imp-trigger-${timestamp}">✨ Improve My Idea</button>
            </div>
        `;

                setTimeout(() => {
                    const b = document.getElementById(`imp-trigger-${timestamp}`);
                    if (b) {
                        animObserver.observe(b);
                        b.onclick = function () { window.triggerImprovement(this); };
                    }
                }, 100);

            } else {
                // ... (Keep your existing Improvement rendering logic here) ...
                let h = `<div class="section-card">
                    <h1 style="font-size:1.4rem; font-weight:800; border-bottom:2px solid #eee; padding-bottom:12px; margin-bottom:24px">Improvement Tips & Ideas</h1>
                    <ul style="padding:0; list-style:none;">`;

                data.tips.forEach((tip, index) => {
                    if (tip.bullets && tip.bullets.length > 0) {
                        const isTools = tip.title.toLowerCase().includes("tools");
                        const hasMany = tip.bullets.length > 2 && !isTools;
                        const containerId = `bullet-list-${index}`;
                        const linkId = `link-more-${index}`;

                        h += `<li style="margin-bottom:35px;">
                        <span class="tip-category-title">${tip.title}</span>
                        <div id="${containerId}" class="bullet-container ${hasMany ? 'collapsed' : ''}">
                            <ul style="list-style-type:disc; padding-left:20px; font-weight:400; margin-bottom:0;">
                                ${tip.bullets.map(b => `<li style="margin-bottom:12px; color:#4b5563; font-size:1rem; line-height:1.6;">${parseLinks(b)}</li>`).join('')}
                            </ul>
                        </div>`;

                        if (hasMany) {
                            h += `<div class="show-more-wrapper">
                            <a href="javascript:void(0)" id="${linkId}" class="link-show-more" onclick="toggleBullets('${containerId}', '${linkId}')">Show more ↓</a>
                          </div>`;
                        }
                        h += `</li>`;
                    }
                });
                h += `</ul></div>`;
                wrap.innerHTML = h;
            }
            container.appendChild(wrap);
        }


        function parseLinks(text) {
            if (!text) return "";

            // 1. Match standard Markdown: [Name](URL)
            let processed = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, (match, name, url) => {
                return `<a href="${url}" target="_blank" class="read-more-btn" style="text-decoration: underline; font-size: 16px; color: #2563eb; font-weight: 700; margin-left: 0;">${name}</a>`;
            });

            // 2. Fallback: Match Name (URL) if AI forgets brackets
            processed = processed.replace(/^([a-zA-Z0-9\s]+)\s*\((https?:\/\/[^\s\)]+)\)/g, (match, name, url) => {
                return `<a href="${url}" target="_blank" class="read-more-btn" style="text-decoration: underline; font-size: 16px; color: #2563eb; font-weight: 700; margin-left: 0;">${name.trim()}</a>`;
            });

            return processed;
        }

        // Global Toggle Function
        window.toggleBullets = (containerId, linkId) => {
            const container = document.getElementById(containerId);
            const link = document.getElementById(linkId);

            if (container.classList.contains('collapsed')) {
                container.classList.remove('collapsed');
                container.style.maxHeight = '2000px';
                link.innerHTML = 'Show less ↑';
            } else {
                container.classList.add('collapsed');
                container.style.maxHeight = '130px';
                link.innerHTML = 'Show more ↓';

                container.parentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };


        function toggleDetail(targetId, btnElement) {
            const detailDiv = document.getElementById(targetId);

            if (detailDiv.classList.contains('show')) {
                detailDiv.classList.remove('show');
                btnElement.innerText = 'In Detail ↓';
            } else {
                detailDiv.classList.add('show');
                btnElement.innerText = 'Show Less ↑';
            }
        }

