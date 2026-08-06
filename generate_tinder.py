import json
import random

# Generate 43 distinct sidebar variants
variants = []

themes = [
    {"bg": "#0f172a", "surf": "rgba(30,41,59,0.5)", "acc": "#8b5cf6", "txt": "#f8fafc", "mut": "#94a3b8", "name": "Glassmorphism Neon"},
    {"bg": "#000000", "surf": "#111111", "acc": "#ffffff", "txt": "#ffffff", "mut": "#888888", "name": "Vercel Pure"},
    {"bg": "#1e1e2e", "surf": "#313244", "acc": "#cba6f7", "txt": "#cdd6f4", "mut": "#a6adc8", "name": "Catppuccin Mocha"},
    {"bg": "#282a36", "surf": "#44475a", "acc": "#ff79c6", "txt": "#f8f8f2", "mut": "#6272a4", "name": "Dracula"},
    {"bg": "#2e3440", "surf": "#3b4252", "acc": "#88c0d0", "txt": "#eceff4", "mut": "#d8dee9", "name": "Nord"},
    {"bg": "#0A2540", "surf": "rgba(255,255,255,0.1)", "acc": "#635BFF", "txt": "#ffffff", "mut": "#8792A2", "name": "Stripe"},
    {"bg": "#050510", "surf": "transparent", "acc": "#ff003c", "txt": "#00f0ff", "mut": "#00f0ff", "name": "Cyberpunk"},
    {"bg": "#000000", "surf": "#000000", "acc": "#00ff00", "txt": "#00ff00", "mut": "#007700", "name": "Terminal"},
    {"bg": "#18181b", "surf": "#27272a", "acc": "#e4e4e7", "txt": "#ffffff", "mut": "#a1a1aa", "name": "Linear"},
    {"bg": "#2b2d31", "surf": "#35373c", "acc": "#5865F2", "txt": "#ffffff", "mut": "#949ba4", "name": "Discord"},
    {"bg": "#141218", "surf": "#4a4458", "acc": "#e8def8", "txt": "#e8def8", "mut": "#cac4d0", "name": "Material 3"},
    {"bg": "#2a2838", "surf": "#363345", "acc": "#ff7e67", "txt": "#ffffff", "mut": "#a49ea8", "name": "Dribbble"},
    {"bg": "#191919", "surf": "rgba(255,255,255,0.05)", "acc": "rgba(255,255,255,0.1)", "txt": "#ffffff", "mut": "rgba(255,255,255,0.7)", "name": "Notion"},
]

styles = [
    {"radius": "12px", "active": "gradient", "font": "Inter"},
    {"radius": "0px", "active": "left-border", "font": "Inter"},
    {"radius": "999px", "active": "solid", "font": "Inter"},
    {"radius": "4px", "active": "outline", "font": "JetBrains Mono"},
    {"radius": "8px", "active": "soft-bg", "font": "Inter"},
    {"radius": "20px", "active": "glow", "font": "Inter"},
    {"radius": "6px", "active": "solid", "font": "system-ui"}
]

layouts = ["standard", "compact", "floating", "two-column"]

for i in range(43):
    theme = themes[i % len(themes)]
    style = styles[(i * 3) % len(styles)]
    layout = layouts[(i * 7) % len(layouts)]
    
    # slight randomization for unique colors on dupes
    bg = theme["bg"]
    if i >= len(themes):
        # tweak bg a bit
        # just for variety, add some hex tweaks
        bg = f"#{random.randint(0, 30):02x}{random.randint(0, 30):02x}{random.randint(0, 30):02x}"
        
    variants.append({
        "id": i,
        "name": f"Wariant {i+1} ({theme['name']} {style['active']})",
        "bg": bg,
        "surf": theme["surf"],
        "acc": theme["acc"],
        "txt": theme["txt"],
        "mut": theme["mut"],
        "radius": style["radius"],
        "activeStyle": style["active"],
        "font": style["font"],
        "layout": layout
    })

html_content = """
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>NetFilmx - Sidebar Tinder</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        body {
            margin: 0; padding: 0; background: #09090b; color: #fff; font-family: 'Inter', sans-serif;
            display: flex; flex-direction: column; height: 100vh; overflow: hidden;
        }
        #header {
            padding: 15px 20px; text-align: center; border-bottom: 1px solid #27272a;
            display: flex; justify-content: space-between; align-items: center;
        }
        #game-area {
            flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
            position: relative; overflow: hidden; width: 100%;
        }
        .matchup-container {
            display: flex; width: 100%; max-width: 1000px; height: 80%; gap: 20px; padding: 20px; box-sizing: border-box;
            transition: transform 0.3s ease;
        }
        @media(max-width: 768px) {
            .matchup-container { flex-direction: column; height: 100%; padding: 10px; gap: 10px;}
        }
        .option-card {
            flex: 1; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column;
            border: 2px solid transparent; transition: all 0.2s; cursor: pointer; position: relative;
        }
        .option-card:hover { border-color: #3b82f6; transform: scale(1.02); }
        
        .sidebar-preview {
            flex: 1; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box;
        }
        
        .nav-item {
            display: flex; align-items: center; gap: 12px; padding: 12px; margin-bottom: 8px;
            text-decoration: none; transition: 0.2s;
        }
        .nav-item svg { width: 20px; height: 20px; }
        
        /* Tinder swipe hints */
        .swipe-hint {
            position: absolute; top: 50%; width: 100%; text-align: center; font-size: 40px; font-weight: bold;
            opacity: 0; pointer-events: none; transition: opacity 0.2s; z-index: 10;
            text-shadow: 0 0 20px rgba(0,0,0,0.8);
        }
        
        #leaderboard-area {
            display: none; padding: 40px; overflow-y: auto; height: 100%; box-sizing: border-box; width: 100%; max-width: 800px; margin: 0 auto;
        }
        .lb-row {
            display: flex; justify-content: space-between; padding: 15px; background: #18181b; margin-bottom: 10px; border-radius: 8px;
            align-items: center;
        }
        .btn {
            background: #fff; color: #000; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;
        }
        .btn:hover { background: #e4e4e7; }
        
        .swipe-controls {
            display: flex; gap: 20px; margin-top: 10px; margin-bottom: 20px;
        }
        .swipe-btn {
            width: 60px; height: 60px; border-radius: 30px; border: none; font-size: 24px; font-weight: bold; cursor: pointer; display: flex; justify-content: center; align-items: center;
        }
        .btn-left { background: #ef4444; color: white; }
        .btn-right { background: #22c55e; color: white; }
    </style>
</head>
<body>
    <div id="header">
        <div>Wybierz lepszy motyw (Lewy vs Prawy)</div>
        <button class="btn" onclick="showLeaderboard()">Pokaż Ranking</button>
    </div>
    
    <div id="game-area">
        <div style="color: #a1a1aa; margin-top: 10px;">PC: Kliknij opcję. Mobile: Kliknij lub Swipe w lewo/prawo</div>
        <div class="matchup-container" id="matchup">
            <!-- Cards injected here -->
        </div>
        <div class="swipe-controls">
            <button class="swipe-btn btn-left" onclick="selectWinner(0)">←</button>
            <button class="swipe-btn btn-right" onclick="selectWinner(1)">→</button>
        </div>
    </div>
    
    <div id="leaderboard-area">
        <h2>Ranking Motywów (Elo Rating)</h2>
        <div id="lb-list"></div>
        <button class="btn" onclick="continueGame()" style="margin-top: 20px;">Wróć do głosowania</button>
    </div>

    <script>
        const variants = VARIANTS_JSON_REPLACE;
        let ratings = {};
        variants.forEach(v => { ratings[v.id] = { id: v.id, score: 1200, matches: 0, data: v } });
        
        let currentMatch = [];
        let touchstartX = 0;
        let touchendX = 0;
        
        function getMatchup() {
            // prioritize variants with fewer matches to balance
            let sorted = Object.values(ratings).sort((a,b) => a.matches - b.matches);
            let p1 = sorted[0];
            
            // find a close opponent in elo among those with few matches
            let pool = sorted.slice(1, 10);
            pool.sort((a,b) => Math.abs(a.score - p1.score) - Math.abs(b.score - p1.score));
            let p2 = pool[0];
            
            if(Math.random() > 0.5) currentMatch = [p1, p2];
            else currentMatch = [p2, p1];
            
            renderMatch();
        }
        
        function generateSidebarHtml(v) {
            let activeStyle = "";
            let hoverStyle = "";
            
            if(v.activeStyle === "gradient") activeStyle = `background: linear-gradient(90deg, ${v.surf}, ${v.acc}); color: #fff; box-shadow: 0 4px 15px ${v.acc}66;`;
            if(v.activeStyle === "left-border") activeStyle = `border-left: 3px solid ${v.acc}; background: ${v.surf}; color: ${v.acc};`;
            if(v.activeStyle === "solid") activeStyle = `background: ${v.acc}; color: #fff;`;
            if(v.activeStyle === "outline") activeStyle = `border: 1px solid ${v.acc}; color: ${v.acc};`;
            if(v.activeStyle === "soft-bg") activeStyle = `background: ${v.acc}33; color: ${v.acc};`;
            if(v.activeStyle === "glow") activeStyle = `background: ${v.acc}; color: #fff; box-shadow: 0 0 20px ${v.acc};`;

            return `
                <div style="background: ${v.bg}; font-family: '${v.font}', sans-serif; border-radius: 12px; height: 100%; border: 1px solid #333;">
                    <div style="padding: 10px; border-bottom: 1px solid #333; text-align: center; color: ${v.txt}; font-size: 14px; font-weight: bold;">
                        ${v.name}
                    </div>
                    <div class="sidebar-preview">
                        <div class="nav-item" style="border-radius: ${v.radius}; ${activeStyle}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                            Dashboard
                        </div>
                        <div class="nav-item" style="border-radius: ${v.radius}; color: ${v.mut};">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect></svg>
                            Filmy
                        </div>
                        <div class="nav-item" style="border-radius: ${v.radius}; color: ${v.mut};">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            Użytkownicy
                        </div>
                    </div>
                </div>
            `;
        }
        
        function renderMatch() {
            const container = document.getElementById('matchup');
            container.innerHTML = `
                <div class="option-card" id="card-0" onclick="selectWinner(0)">
                    <div class="swipe-hint" style="color:#ef4444" id="hint-0">LEWY</div>
                    ${generateSidebarHtml(currentMatch[0].data)}
                </div>
                <div class="option-card" id="card-1" onclick="selectWinner(1)">
                    <div class="swipe-hint" style="color:#22c55e" id="hint-1">PRAWY</div>
                    ${generateSidebarHtml(currentMatch[1].data)}
                </div>
            `;
            
            // Add swipe listeners to game area
            const gameArea = document.getElementById('game-area');
            gameArea.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; }, {passive: true});
            gameArea.addEventListener('touchend', e => { 
                touchendX = e.changedTouches[0].screenX; 
                handleSwipe(); 
            }, {passive: true});
        }
        
        function handleSwipe() {
            const threshold = 50;
            if (touchendX < touchstartX - threshold) {
                // swiped left -> selected left (option 0)
                selectWinner(0);
            }
            if (touchendX > touchstartX + threshold) {
                // swiped right -> selected right (option 1)
                selectWinner(1);
            }
        }
        
        function updateElo(w, l) {
            let Ra = ratings[w.id].score;
            let Rb = ratings[l.id].score;
            let K = 32;
            
            let Ea = 1 / (1 + Math.pow(10, (Rb - Ra)/400));
            let Eb = 1 / (1 + Math.pow(10, (Ra - Rb)/400));
            
            ratings[w.id].score = Ra + K * (1 - Ea);
            ratings[l.id].score = Rb + K * (0 - Eb);
            
            ratings[w.id].matches++;
            ratings[l.id].matches++;
        }
        
        function selectWinner(winnerIndex) {
            const winner = currentMatch[winnerIndex];
            const loser = currentMatch[1 - winnerIndex];
            
            // animation
            document.getElementById(`card-${winnerIndex}`).style.transform = 'scale(1.05)';
            document.getElementById(`card-${winnerIndex}`).style.borderColor = '#22c55e';
            
            updateElo(winner, loser);
            
            setTimeout(() => {
                getMatchup();
            }, 300);
        }
        
        function showLeaderboard() {
            document.getElementById('game-area').style.display = 'none';
            document.getElementById('leaderboard-area').style.display = 'block';
            
            let sorted = Object.values(ratings).sort((a,b) => b.score - a.score);
            let html = '';
            sorted.forEach((item, index) => {
                html += `
                    <div class="lb-row">
                        <div>
                            <strong>#${index+1}</strong> - ${item.data.name}
                            <div style="font-size:12px; color:#a1a1aa">Mecze: ${item.matches}</div>
                        </div>
                        <div style="font-size: 20px; font-weight: bold; color: #3b82f6;">
                            ${Math.round(item.score)} Elo
                        </div>
                    </div>
                `;
            });
            document.getElementById('lb-list').innerHTML = html;
        }
        
        function continueGame() {
            document.getElementById('game-area').style.display = 'flex';
            document.getElementById('leaderboard-area').style.display = 'none';
        }
        
        // Start
        getMatchup();
    </script>
</body>
</html>
"""

html_content = html_content.replace("VARIANTS_JSON_REPLACE", json.dumps(variants))

with open("admin_prototypes.html", "w", encoding="utf-8") as f:
    f.write(html_content)

