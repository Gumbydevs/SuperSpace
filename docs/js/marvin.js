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
            @keyframes marvinAppear {
                0% { transform: translateX(30px); opacity: 0; }
                100% { transform: translateX(0); opacity: 1; }
            }
            .marvin-container {
                position: absolute;
                top: 0px;
                left: 100%;
                width: 58px;
                height: 58px;
                pointer-events: none;
                animation: marvinAppear 0.5s ease-out forwards;
                z-index: 10001;
            }
            .marvin-canvas {
                width: 58px;
                height: 58px;
            }
        `;
  // Mobile-specific adjustments: show Marvin inside visible area and scale down
  style.textContent += `
      @media (max-width: 760px) {
        .marvin-container {
          left: auto !important;
          right: 8px !important;
          top: calc(env(safe-area-inset-top, 8px) + 6px) !important;
          width: 36px !important;
          height: 36px !important;
          transform: none !important;
          animation: marvinAppear 0.25s ease-out forwards;
          pointer-events: none;
          z-index: 10500 !important; /* stay under tutorial (tutorial z-index is 11000) */
        }
        .marvin-canvas { width: 36px !important; height: 36px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  createMarvin() {
    const container = document.createElement('div');
    container.className = 'marvin-container';

    // No arms, just Marvin's body

    // Create canvas for pixel art
    const canvas = document.createElement('canvas');
    canvas.className = 'marvin-canvas';
    canvas.width = 58;
    canvas.height = 58;
    container.appendChild(canvas);

    // Animate Marvin's body wiggle
    this.animateMarvinWiggle(canvas);

    return container;
  }

  animateMarvinWiggle(canvas) {
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const scale = size / 24;
    let startTime = null;
    const draw = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const t = (timestamp - startTime) / 1000;
      // Wiggle: oscillate rotation and slight x offset
      const angle = Math.sin(t * 4) * 0.18; // ~10deg wiggle
      const xWiggle = Math.sin(t * 2) * 2 * scale;
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2 + xWiggle, size / 2);
      ctx.rotate(angle);
      ctx.translate(-size / 2, -size / 2);
      // Draw Marvin body (no arms)
      // Head (metallic)
      ctx.fillStyle = '#c0c0c0';
      ctx.fillRect(6 * scale, 4 * scale, 12 * scale, 14 * scale);
      ctx.fillStyle = '#a0a0a0';
      ctx.fillRect(7 * scale, 5 * scale, 10 * scale, 12 * scale);
      // Visor
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(8 * scale, 6 * scale, 8 * scale, 6 * scale);
      // Eyes (glowing red)
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(9 * scale, 7 * scale, 2 * scale, 2 * scale);
      ctx.fillRect(13 * scale, 7 * scale, 2 * scale, 2 * scale);
      // Mouth grille
      ctx.fillStyle = '#666';
      ctx.fillRect(9 * scale, 11 * scale, 6 * scale, 2 * scale);
      ctx.fillStyle = '#333';
      ctx.fillRect(
        10 * scale,
        11 * scale,
        Math.max(1, 1 * scale),
        Math.max(1, 1 * scale),
      );
      ctx.fillRect(
        12 * scale,
        11 * scale,
        Math.max(1, 1 * scale),
        Math.max(1, 1 * scale),
      );
      ctx.fillRect(
        14 * scale,
        11 * scale,
        Math.max(1, 1 * scale),
        Math.max(1, 1 * scale),
      );
      // Antenna
      ctx.fillStyle = '#888';
      ctx.fillRect(11 * scale, 2 * scale, 2 * scale, 3 * scale);
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(11 * scale, 2 * scale, 2 * scale, Math.max(1, 1 * scale));
      // Body
      ctx.fillStyle = '#808080';
      ctx.fillRect(5 * scale, 17 * scale, 14 * scale, 7 * scale);
      ctx.fillStyle = '#696969';
      ctx.fillRect(6 * scale, 18 * scale, 12 * scale, 6 * scale);
      // Control lights
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(
        7 * scale,
        20 * scale,
        Math.max(1, 1 * scale),
        Math.max(1, 1 * scale),
      );
      ctx.fillRect(
        9 * scale,
        20 * scale,
        Math.max(1, 1 * scale),
        Math.max(1, 1 * scale),
      );
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(
        11 * scale,
        20 * scale,
        Math.max(1, 1 * scale),
        Math.max(1, 1 * scale),
      );
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(
        13 * scale,
        20 * scale,
        Math.max(1, 1 * scale),
        Math.max(1, 1 * scale),
      );
      ctx.fillRect(
        15 * scale,
        20 * scale,
        Math.max(1, 1 * scale),
        Math.max(1, 1 * scale),
      );
      ctx.restore();
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
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
