export class InputHandler {
    constructor() {
        this.keys = [];
        
        window.addEventListener('keydown', (e) => {
            // Prevent default behaviors for game control keys
            if(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
            
            // Add key to the array if it's not already there
            if(!this.keys.includes(e.code) && !e.repeat) {
                this.keys.push(e.code);
            }
        });
        
        window.addEventListener('keyup', (e) => {
            // Remove key from the array
            const index = this.keys.indexOf(e.code);
            if(index > -1) {
                this.keys.splice(index, 1);
            }
        });
        
        // Add touch controls for mobile
        this.setupTouchControls();
    }
    
    setupTouchControls() {
        // Virtual joystick for mobile would go here in a more complete game
        // For now, we'll just add some basic debugging
        console.log('Touch controls are not fully implemented in this prototype');
        
        // Add event listeners for touch if needed
        /*
        document.addEventListener('touchstart', (e) => {
            // Handle touch controls
        });
        */
    }
}