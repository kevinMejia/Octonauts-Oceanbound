// Dialog dismissal resumes gameplay; Tab can still reach the HUD controls.
export function focusGameplay(){
 const canvas=document.querySelector('#ocean');
 if(!canvas)return;
 if(!canvas.hasAttribute('tabindex'))canvas.tabIndex=-1;
 canvas.focus({preventScroll:true});
}
