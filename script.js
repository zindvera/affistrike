
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

    // Use a combination of timestamp and random to ensure absolute uniqueness
    const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
    const fullId = 'f-' + uniqueId;
    const truncId = 't-' + uniqueId;

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
            1. PROBLEM SCORE: Evaluate ONLY the "Customer Pain Point" (the gap in the market or user need). DO NOT mention business hurdles like operational costs, staffing, or regulations. SCORE number will only on customer pain point only. High pain point or market gap will be given high score and less pain point or gap will get less score.
            2. CONCEPT & USP SCORE: Score must be only on how unique or different product or service idea is from existing competition in market.
            3. DEEP JUSTIFICATION: Every "desc" MUST provide a logical "because" by citing specific details from the user's description. Max 40 words.
            4. MANDATORY KEYS: Use these exact keys: "score", "label", "desc".
          
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
    1. "Features or Benefits Addon"
    2. "Free Marketing"
    3. "Paid Marketing"
    4. "Tools Which Can Help"

    CRITICAL CONTENT RULES:
    - CATEGORY 4 (Tools) MANDATORY FORMAT: 
        * You MUST use exactly this Markdown format: [Tool Name](URL) : Description.
        * Example: "[Carrd](https://carrd.co/) : Use this to build a landing page for your service so customers can book appointments."
    - TONE OF ADVICE: 
        * NEVER use generic descriptions like "A no-code builder."
        * ALWAYS write as a consultant giving specific advice to THIS business. 
        * Example: "Use this tool to manage your [specific user business goal] by [specific action]."
    - QUANTITY & SELECTIVITY:
        * Suggest essential tools based on the nature of the idea (Physical vs Digital).
        * You may suggest UP TO 10 tools if the business complexity requires multiple solutions for setup, operations, and marketing.
        * Do not add "filler" tools; only recommend what adds genuine value to the user's specific idea.

    AVAILABLE TOOLS:
    ${toolList}
    
    Required JSON Structure:
    {
        "tips": [
            { "title": "Features or Benefits Addon", "bullets": ["..."] },
            { "title": "Free Marketing", "bullets": ["..."] },
            { "title": "Paid Marketing", "bullets": ["..."] },
            { "title": "Tools Which Can Help", "bullets": ["[Tool Name](URL) : Specific business advice on how this helps this user."] }
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

    // Generate a unique ID for this specific AI response block
    const responseId = Date.now() + Math.floor(Math.random() * 1000);

    if (mode === "VALIDATE") {
        // --- CONVERSION LOGIC ---
        let finalScoreFormatted = data.final.score;
        if (typeof finalScoreFormatted === 'string' && finalScoreFormatted.includes('%')) {
            let num = parseFloat(finalScoreFormatted.replace('%', ''));
            finalScoreFormatted = (num / 10).toFixed(1) + "/10";
        } else if (!isNaN(finalScoreFormatted) && finalScoreFormatted > 10) {
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
                <button class="improve-btn" id="imp-trigger-${responseId}">✨ Improve My Idea</button>
            </div>
        `;

        setTimeout(() => {
            const b = document.getElementById(`imp-trigger-${responseId}`);
            if (b) {
                animObserver.observe(b);
                b.onclick = function () { window.triggerImprovement(this); };
            }
        }, 100);

    } else {
        // --- IMPROVEMENT RENDERING LOGIC ---
        let h = `<div class="section-card">
            <h1 style="font-size:1.4rem; font-weight:800; border-bottom:2px solid #eee; padding-bottom:12px; margin-bottom:24px">Improvement Tips & Ideas</h1>
            <ul style="padding:0; list-style:none;">`;

        data.tips.forEach((tip, index) => {
            if (tip.bullets && tip.bullets.length > 0) {
                const isTools = tip.title.toLowerCase().includes("tools");
                const hasMany = tip.bullets.length > 2 && !isTools;

                // Unique IDs using responseId prevents collisions with previous ideas
                const containerId = `bullet-list-${responseId}-${index}`;
                const linkId = `link-more-${responseId}-${index}`;

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

    // 1. Primary: Match [Name](URL)
    let processed = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, (match, name, url) => {
        return `<a href="${url}" target="_blank" class="read-more-btn" style="text-decoration: underline; font-size: 16px; color: #2563eb; font-weight: 700; margin-left: 0;">${name}</a>`;
    });

    // 2. Cleanup: If the AI puts a URL in plain text (http://...), make it clickable
    const urlRegex = /(?<!href=")(https?:\/\/[^\s\)]+)/g;
    processed = processed.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" style="color: #2563eb; text-decoration: underline;">${url}</a>`;
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

