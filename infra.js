document.addEventListener('DOMContentLoaded', () => {
    const svg = document.getElementById('infra-svg');
    const logsContainer = document.getElementById('terminal-logs');
    const commandText = document.getElementById('current-command');
    
    const layers = {
        ENTRY: 60,
        ROUTING: 160,
        SERVICES: 270,
        PODS: 370
    };

    const nodes = [
        { id: 'user', label: 'SOURCE TRAFFIC', x: 200, y: 40, type: 'pc' },
        { id: 'alb', label: 'AWS LOAD BALANCER', x: 200, y: 95, type: 'edge' },
        { id: 'ingress', label: 'INGRESS-HUB', x: 200, y: layers.ROUTING, type: 'ingress' },
        
        // Horizontal Service Split
        { id: 'svc_fe', label: 'FRONTEND-SVC', x: 100, y: layers.SERVICES, type: 'mesh' },
        { id: 'svc_be', label: 'BACKEND-SVC', x: 220, y: layers.SERVICES, type: 'mesh' },
        
        // Pod Execution
        { id: 'pod_fe', x: 100, y: layers.PODS, type: 'pod', parent: 'svc_fe' },
        { id: 'pod_be', x: 220, y: layers.PODS, type: 'pod', parent: 'svc_be' },
        
        // Side-car Database Branch (Horizontal shift)
        { id: 'svc_db', label: 'DATABASE-SVC', x: 340, y: layers.PODS, type: 'mesh' },
        { id: 'db', label: 'POSTGRES-HA', x: 340, y: layers.PODS + 60, type: 'pod' }
    ];

    const connections = [
        { from: 'user', to: 'alb' },
        { from: 'alb', to: 'ingress' },
        { from: 'ingress', to: 'svc_fe' },
        { from: 'ingress', to: 'svc_be' },
        { from: 'svc_fe', to: 'pod_fe' },
        { from: 'svc_be', to: 'pod_be' },
        { from: 'pod_be', to: 'svc_db' }, // Side connection
        { from: 'svc_db', to: 'db' }
    ];

    function createNS(tag, attrs) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
        return el;
    }

    // Straight Connection Paths
    connections.forEach(conn => {
        const from = nodes.find(n => n.id === conn.from);
        const to = nodes.find(n => n.id === conn.to);
        const pathData = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
        
        conn.reqPath = createNS('path', {
            d: pathData, stroke: 'var(--request-color)', 'stroke-width': '0.8', 
            fill: 'none', opacity: 0.1, 'marker-end': 'url(#arrow-cyan)'
        });
        
        conn.respPath = createNS('path', {
            d: pathData, stroke: 'var(--response-color)', 'stroke-width': '0.8', 
            fill: 'none', opacity: 0.1, 'marker-end': 'url(#arrow-green)'
        });

        svg.insertBefore(conn.reqPath, svg.firstChild);
        svg.insertBefore(conn.respPath, svg.firstChild);
    });

    // Node Rendering
    nodes.forEach(node => {
        const group = createNS('g', { class: `node node-${node.type}` });
        
        if (node.type === 'pc') {
            const screen = createNS('rect', { x: node.x - 8, y: node.y - 8, width: 16, height: 12, rx: 1, fill: 'var(--accent-color)', filter: 'url(#glow)' });
            const stand = createNS('rect', { x: node.x - 1, y: node.y + 4, width: 2, height: 2, fill: 'var(--accent-color)' });
            const base = createNS('rect', { x: node.x - 4, y: node.y + 6, width: 8, height: 1.5, rx: 0.5, fill: 'var(--accent-color)' });
            group.appendChild(screen); group.appendChild(stand); group.appendChild(base);
        } else if (node.type === 'pod') {
            const square = createNS('rect', { x: node.x - 4, y: node.y - 4, width: 8, height: 8, fill: 'rgba(255,255,255,0.8)', filter: 'url(#glow)' });
            group.appendChild(square);
        } else {
            const circle = createNS('circle', { cx: node.x, cy: node.y, r: 5, fill: 'var(--accent-color)', filter: 'url(#glow)' });
            group.appendChild(circle);
        }

        if (node.label) {
            const label = createNS('text', {
                x: node.x, y: node.y + (node.y < 130 ? -18 : 22),
                'text-anchor': 'middle', fill: 'var(--text-secondary)', 'font-size': '8px', 'font-family': 'var(--font-mono)'
            });
            label.textContent = node.label.toUpperCase();
            group.appendChild(label);
        }
        svg.appendChild(group);
    });

    // High-Density Traffic Logic
    function spawnRiver(pathEl, color, type) {
        const isResp = type === 'response';
        const density = 15; // EXTREME VOLUME
        for (let i = 0; i < density; i++) {
            setTimeout(() => {
                const particle = createNS('circle', { r: 1, fill: color, opacity: 0 });
                svg.appendChild(particle);
                
                const dur = isResp ? 1800 : 1200; // Fast and snappy
                const anim = createNS('animateMotion', {
                    path: pathEl.getAttribute('d'), dur: `${dur}ms`, repeatCount: 'indefinite',
                    keyPoints: isResp ? '1;0' : '0;1', keyTimes: '0;1', calcMode: 'linear'
                });
                const opacity = createNS('animate', { attributeName: 'opacity', values: '0;1;1;0', dur: `${dur}ms`, repeatCount: 'indefinite' });
                
                particle.appendChild(anim);
                particle.appendChild(opacity);
            }, i * 150);
        }
    }

    connections.forEach(conn => {
        // Reduced interval for extreme traffic volume
        setInterval(() => spawnRiver(conn.reqPath, 'var(--request-color)', 'request'), 1200 + Math.random() * 800);
        setInterval(() => spawnRiver(conn.respPath, 'var(--response-color)', 'response'), 2000 + Math.random() * 800);
    });

    // Streaming Logs
    const logData = [
        { cat: 'REQUEST', text: 'ALB routing traffic to Ingress', class: 'tag-request' },
        { cat: 'PROCESS', text: 'Backend node processing API request', class: 'tag-process' },
        { cat: 'DB_OP', text: 'Writing session data to Postgres HA', class: 'tag-db' },
        { cat: 'SUCCESS', text: 'Transaction complete: HTTP 200', class: 'tag-success' }
    ];

    function streamLog() {
        const item = logData[Math.floor(Math.random() * logData.length)];
        const line = document.createElement('div');
        line.className = 'log-line';
        line.innerHTML = `<span style="opacity:0.3">[${new Date().toLocaleTimeString('en-GB')}]</span> <span class="log-tag ${item.class}">${item.cat}</span> <span>${item.text}</span>`;
        logsContainer.appendChild(line);
        if (logsContainer.childNodes.length > 8) logsContainer.removeChild(logsContainer.firstChild);
        logsContainer.scrollTop = logsContainer.scrollHeight;
        setTimeout(streamLog, 600 + Math.random() * 600);
    }
    streamLog();

    // 6. Scroll Reveal Observer
    const revealOptions = { threshold: 0.15, rootMargin: "0px 0px -50px 0px" };
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, revealOptions);

    // Apply reveal classes and observe
    const aboutHeader = document.querySelector('.about-header');
    const aboutContent = document.querySelector('.about-content');
    const capabilities = document.querySelector('.capabilities-grid');
    const techStack = document.querySelector('.tech-stack-inline');
    const profile = document.querySelector('.profile-frame');

    [aboutHeader, aboutContent, capabilities, techStack, profile].forEach(el => {
        if(el) {
            el.classList.add('reveal-in');
            revealObserver.observe(el);
        }
    });
});
