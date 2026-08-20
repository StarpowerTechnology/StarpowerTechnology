(function initializeExclusiveLogin(){
  const form=document.querySelector('[data-login-form]');
  const message=document.querySelector('[data-login-message]');
  const submit=form.querySelector('button[type="submit"]');

  fetch('/api/session',{credentials:'same-origin',cache:'no-store'}).then(response=>{
    if(response.ok)location.replace('/exclusiveeditor');
  }).catch(()=>{});

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    submit.disabled=true;
    message.textContent='Signing in…';
    const fields=new FormData(form);
    try{
      const response=await fetch('/api/login',{
        method:'POST',
        credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({username:fields.get('username'),password:fields.get('password')}),
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Login failed.');
      form.reset();
      location.replace('/exclusiveeditor');
    }catch(error){
      message.textContent=error.message;
      submit.disabled=false;
    }
  });
})();
