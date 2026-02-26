// Temporary test runner for TutorialSystem
global.window = {};
global.document = {
  createElement: () => ({ style:{}, appendChild: () => {}, classList:{ add:()=>{} }, setAttribute: ()=>{}, innerHTML: '', firstChild: null, parentNode: null }),
  body: { appendChild: () => {} },
  getElementById: () => null
};
global.window.analytics = { track: (e,p) => console.log('ANALYTICS TRACK', e, JSON.stringify(p)) };
const A = require('./js/tutorial');
const mockGame = { player: { x:0,y:0, credits:0, gems:0, currentWeapon: 'Laser' }, canvas: { addEventListener: ()=>{} }, soundManager: { play: ()=>{} }, ui: { showMessage:(m)=>console.log('UI MSG',m), updateHUD: ()=>{} }, shop: { updateShopContent: ()=>{}, currentTab: '' } };
const t = new A.TutorialSystem(mockGame);
t.hasEnteredWorld = true;
console.log('STARTING TUTORIAL');
t.startTutorial();
setTimeout(()=>{
  console.log('TRYING TO COMPLETE MOVEMENT STEP');
  t.checkStepProgress('movement');
  setTimeout(()=>{
    console.log('SKIPPING TUTORIAL');
    t.skipTutorial();
  },200);
},200);

// Keep process alive a bit to allow timers
setTimeout(()=>process.exit(0),1500);
