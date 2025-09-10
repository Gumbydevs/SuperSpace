// Marvin the Robot Assistant for SuperSpace
// Provides a character assistant for game notifications

export class MarvinAssistant {
    constructor() {
        // Create style for Marvin
        this.addStyles();
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes marvinWave {
                0%, 100% { transform: rotate(0deg); }
                25% { transform: rotate(-15deg); }
                75% { transform: rotate(15deg); }
            }
            
            @keyframes marvinBounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            
            @keyframes marvinAppear {
                0% { transform: translateX(50px); opacity: 0; }
                100% { transform: translateX(0); opacity: 1; }
            }
            
            .marvin-container {
                position: absolute;
                top: -20px;
                left: 100%;
                width: 80px;
                height: 120px;
                pointer-events: none;
                animation: marvinAppear 0.5s ease-out forwards;
                z-index: 10001; /* Ensure Marvin appears above other elements */
            }
            
            .marvin-body {
                position: relative;
                width: 60px;
                height: 90px;
                background: #555;
                border-radius: 30px;
                margin: 0 auto;
                box-shadow: inset 0 -10px 20px rgba(0,0,0,0.3), 0 5px 10px rgba(0,0,0,0.2);
            }
            
            .marvin-head {
                position: absolute;
                top: -25px;
                left: 10px;
                width: 40px;
                height: 40px;
                background: #777;
                border-radius: 50%;
                box-shadow: inset 0 -5px 10px rgba(0,0,0,0.3);
            }
            
            .marvin-eye {
                position: absolute;
                width: 10px;
                height: 10px;
                background: #0af;
                border-radius: 50%;
                top: 12px;
                box-shadow: 0 0 8px #0af;
            }
            
            .marvin-eye.left {
                left: 8px;
            }
            
            .marvin-eye.right {
                right: 8px;
            }
            
            .marvin-antenna {
                position: absolute;
                top: -15px;
                left: 18px;
                width: 4px;
                height: 15px;
                background: #999;
                border-radius: 2px;
            }
            
            .marvin-antenna::after {
                content: '';
                position: absolute;
                top: -5px;
                left: -3px;
                width: 10px;
                height: 5px;
                background: #0af;
                border-radius: 50%;
                box-shadow: 0 0 8px #0af;
            }
            
            .marvin-arm {
                position: absolute;
                width: 12px;
                height: 40px;
                background: #666;
                border-radius: 6px;
            }
            
            .marvin-arm.left {
                top: 15px;
                left: -5px;
                transform-origin: top center;
            }
            
            .marvin-arm.right {
                top: 15px;
                right: -5px;
                transform-origin: top center;
                animation: marvinWave 2s ease-in-out infinite;
            }
            
            .marvin-leg {
                position: absolute;
                bottom: -20px;
                width: 15px;
                height: 25px;
                background: #555;
                border-radius: 7px;
            }
            
            .marvin-leg.left {
                left: 10px;
            }
            
            .marvin-leg.right {
                right: 10px;
            }
            
            .marvin-mouth {
                position: absolute;
                bottom: 10px;
                left: 15px;
                width: 30px;
                height: 5px;
                background: #333;
                border-radius: 5px;
            }
        `;
        document.head.appendChild(style);
    }
    
    createMarvin() {
        const container = document.createElement('div');
        container.className = 'marvin-container';
        
        const body = document.createElement('div');
        body.className = 'marvin-body';
        
        const head = document.createElement('div');
        head.className = 'marvin-head';
        
        const leftEye = document.createElement('div');
        leftEye.className = 'marvin-eye left';
        
        const rightEye = document.createElement('div');
        rightEye.className = 'marvin-eye right';
        
        const antenna = document.createElement('div');
        antenna.className = 'marvin-antenna';
        
        const leftArm = document.createElement('div');
        leftArm.className = 'marvin-arm left';
        
        const rightArm = document.createElement('div');
        rightArm.className = 'marvin-arm right';
        
        const leftLeg = document.createElement('div');
        leftLeg.className = 'marvin-leg left';
        
        const rightLeg = document.createElement('div');
        rightLeg.className = 'marvin-leg right';
        
        const mouth = document.createElement('div');
        mouth.className = 'marvin-mouth';
        
        head.appendChild(leftEye);
        head.appendChild(rightEye);
        head.appendChild(antenna);
        
        body.appendChild(head);
        body.appendChild(leftArm);
        body.appendChild(rightArm);
        body.appendChild(mouth);
        body.appendChild(leftLeg);
        body.appendChild(rightLeg);
        
        container.appendChild(body);
        
        return container;
    }
    
    attachToNotification(notificationElement) {
        const marvin = this.createMarvin();
        notificationElement.style.position = 'relative';
        notificationElement.appendChild(marvin);
        return marvin;
    }
}

// Initialize Marvin globally for easy access
window.marvinAssistant = new MarvinAssistant();
