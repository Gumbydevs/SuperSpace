// Quick fix script - run this in browser console to clean up avatar issues
console.log("=== CLEANING UP AVATAR ISSUES ===");

// Step 1: Clear any duplicate premium avatars
console.log("Step 1: Cleaning up duplicate premium slots...");
const allOptions = document.querySelectorAll('.avatar-option');
const seenAvatars = new Set();

// Allowed free avatars: han, ripley, missy
allOptions.forEach(option => {
    const avatarId = option.dataset.avatar;
    if (avatarId && avatarId !== 'han' && avatarId !== 'ripley' && avatarId !== 'missy') {
        if (seenAvatars.has(avatarId)) {
            // This is a duplicate - remove it
            console.log('Removing duplicate:', avatarId);
            option.classList.add('disabled');
            delete option.dataset.avatar;
            option.querySelector('.avatar-name').textContent = 'LOCKED';
            
            // Remove premium styling
            option.style.border = '';
            option.style.background = '';
            
            // Remove lock icon
            const lockIcon = option.querySelector('.premium-lock');
            if (lockIcon) lockIcon.remove();
        } else {
            seenAvatars.add(avatarId);
        }
    }
});

// Step 2: Force refresh the avatar system
console.log("Step 2: Force refreshing avatar system...");
window.refreshAvatars();

console.log("=== CLEANUP COMPLETE ===");
