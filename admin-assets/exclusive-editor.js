(function initializeExclusiveEditor(){
  const pageNames={models:'Models','arxiv-wvy-base':'arXiv-WVY-base','human-data-center':'Human Data Center',roadmap:'Roadmap',sculpting:'WVY World','future-vision':'Future Vision',research:'Research'};
  let siteContent=null;

  const status=document.querySelector('[data-publish-status]');
  const sectionForm=document.querySelector('[data-section-form]');
  const articleForm=document.querySelector('[data-article-form]');
  const sectionMessage=document.querySelector('[data-section-message]');
  const articleMessage=document.querySelector('[data-article-message]');
  const cancelSection=document.querySelector('[data-cancel-section]');
  const cancelArticle=document.querySelector('[data-cancel-article]');

  async function apiRequest(path,options={}){
    const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
    const result=await response.json().catch(()=>({}));
    if(response.status===401){location.replace('/exclusivelogin');throw new Error('Authentication required.');}
    if(!response.ok)throw new Error(result.error||'The request failed.');
    return result;
  }

  function button(label,attributes={}){
    const element=document.createElement('button');
    element.type='button';
    element.textContent=label;
    Object.entries(attributes).forEach(([name,value])=>element.dataset[name]=value);
    return element;
  }

  function excerpt(value,maximum=120){
    const normalized=String(value||'').replace(/\s+/g,' ').trim();
    return normalized.length>maximum?`${normalized.slice(0,maximum)}…`:normalized;
  }

  function renderSections(){
    const list=document.querySelector('[data-section-list]');
    list.replaceChildren();
    let count=0;
    Object.entries(pageNames).forEach(([page,name])=>{
      const sections=siteContent.pages?.[page]?.sections||[];
      sections.forEach(section=>{
        count+=1;
        const item=document.createElement('article');
        item.className='content-item';
        const meta=document.createElement('small');
        meta.textContent=name;
        const title=document.createElement('h3');
        title.textContent=section.title;
        const copy=document.createElement('p');
        copy.textContent=excerpt(section.body);
        const actions=document.createElement('div');
        actions.className='item-actions';
        actions.append(button('EDIT',{editSection:section.id,page}),button('DELETE',{deleteSection:section.id,page,delete:'true'}));
        item.append(meta,title,copy,actions);
        list.appendChild(item);
      });
    });
    if(!count){
      const empty=document.createElement('p');
      empty.className='empty-list';
      empty.textContent='No custom sections yet.';
      list.appendChild(empty);
    }
  }

  function renderArticles(){
    const list=document.querySelector('[data-article-list]');
    list.replaceChildren();
    const articles=siteContent.researchArticles||[];
    if(!articles.length){
      const empty=document.createElement('p');
      empty.className='empty-list';
      empty.textContent='No research articles yet.';
      list.appendChild(empty);
      return;
    }
    articles.forEach(article=>{
      const item=document.createElement('article');
      item.className='content-item';
      const date=document.createElement('small');
      date.textContent=article.date;
      const title=document.createElement('h3');
      title.textContent=article.title;
      const subtitle=document.createElement('p');
      subtitle.textContent=excerpt(article.subtitle);
      const actions=document.createElement('div');
      actions.className='item-actions';
      actions.append(button('EDIT',{editArticle:article.id}),button('DELETE',{deleteArticle:article.id,delete:'true'}));
      item.append(date,title,subtitle,actions);
      list.appendChild(item);
    });
  }

  function renderAll(){renderSections();renderArticles();}

  function resetSectionForm(){
    sectionForm.reset();
    sectionForm.elements.id.value='';
    document.querySelector('[data-section-form-title]').textContent='Create a section';
    sectionForm.querySelector('.primary-button').textContent='PUBLISH SECTION';
    cancelSection.hidden=true;
    sectionMessage.textContent='';
  }

  function resetArticleForm(){
    articleForm.reset();
    articleForm.elements.id.value='';
    articleForm.elements.date.value=new Date().toISOString().slice(0,10);
    document.querySelector('[data-article-form-title]').textContent='Create an article';
    document.querySelector('[data-image-requirement]').textContent='PNG, JPG or WebP · maximum 3 MB';
    articleForm.querySelector('.primary-button').textContent='PUBLISH ARTICLE';
    cancelArticle.hidden=true;
    articleMessage.textContent='';
  }

  function setFormBusy(form,busy){
    form.querySelectorAll('button').forEach(item=>item.disabled=busy);
  }

  function showPublished(commitSha){
    status.textContent=`Published to GitHub (${commitSha.slice(0,7)}). Vercel is redeploying the website.`;
  }

  function imagePayload(file){
    if(!file||!file.size)return Promise.resolve(null);
    if(file.size>3_000_000)return Promise.reject(new Error('The image must be smaller than 3 MB.'));
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error('The image could not be read.'));
      reader.onload=()=>resolve({type:file.type,base64:String(reader.result).split(',')[1]});
      reader.readAsDataURL(file);
    });
  }

  document.querySelectorAll('[data-editor-tab]').forEach(tab=>tab.addEventListener('click',()=>{
    document.querySelectorAll('[data-editor-tab]').forEach(item=>item.classList.toggle('is-active',item===tab));
    document.querySelectorAll('[data-editor-panel]').forEach(panel=>panel.classList.toggle('is-active',panel.dataset.editorPanel===tab.dataset.editorTab));
  }));

  sectionForm.addEventListener('submit',async event=>{
    event.preventDefault();
    setFormBusy(sectionForm,true);
    sectionMessage.textContent='Publishing…';
    const fields=new FormData(sectionForm);
    try{
      const result=await apiRequest('/api/page-sections',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:fields.get('id')?'update':'create',id:fields.get('id'),page:fields.get('page'),title:fields.get('title'),subtitle:fields.get('subtitle'),body:fields.get('body')}),
      });
      siteContent=result.content;
      renderAll();
      resetSectionForm();
      showPublished(result.commitSha);
    }catch(error){sectionMessage.textContent=error.message;}finally{setFormBusy(sectionForm,false);}
  });

  articleForm.addEventListener('submit',async event=>{
    event.preventDefault();
    setFormBusy(articleForm,true);
    articleMessage.textContent='Publishing…';
    const fields=new FormData(articleForm);
    try{
      const image=await imagePayload(fields.get('image'));
      if(!fields.get('id')&&!image)throw new Error('Choose a cover image.');
      const result=await apiRequest('/api/research-articles',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:fields.get('id')?'update':'create',id:fields.get('id'),title:fields.get('title'),subtitle:fields.get('subtitle'),date:fields.get('date'),body:fields.get('body'),image}),
      });
      siteContent=result.content;
      renderAll();
      resetArticleForm();
      showPublished(result.commitSha);
    }catch(error){articleMessage.textContent=error.message;}finally{setFormBusy(articleForm,false);}
  });

  document.querySelector('[data-section-list]').addEventListener('click',async event=>{
    const edit=event.target.closest('[data-edit-section]');
    const remove=event.target.closest('[data-delete-section]');
    if(edit){
      const section=siteContent.pages[edit.dataset.page].sections.find(item=>item.id===edit.dataset.editSection);
      if(!section)return;
      sectionForm.elements.id.value=section.id;
      sectionForm.elements.page.value=edit.dataset.page;
      sectionForm.elements.title.value=section.title;
      sectionForm.elements.subtitle.value=section.subtitle||'';
      sectionForm.elements.body.value=section.body;
      document.querySelector('[data-section-form-title]').textContent='Edit section';
      sectionForm.querySelector('.primary-button').textContent='UPDATE SECTION';
      cancelSection.hidden=false;
      sectionForm.scrollIntoView({behavior:'smooth',block:'start'});
    }
    if(remove&&confirm('Delete this section from the website?')){
      try{
        const result=await apiRequest('/api/page-sections',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',id:remove.dataset.deleteSection,page:remove.dataset.page})});
        siteContent=result.content;renderAll();resetSectionForm();showPublished(result.commitSha);
      }catch(error){sectionMessage.textContent=error.message;}
    }
  });

  document.querySelector('[data-article-list]').addEventListener('click',async event=>{
    const edit=event.target.closest('[data-edit-article]');
    const remove=event.target.closest('[data-delete-article]');
    if(edit){
      const article=siteContent.researchArticles.find(item=>item.id===edit.dataset.editArticle);
      if(!article)return;
      articleForm.elements.id.value=article.id;
      articleForm.elements.title.value=article.title;
      articleForm.elements.subtitle.value=article.subtitle;
      articleForm.elements.date.value=article.date;
      articleForm.elements.body.value=article.body;
      document.querySelector('[data-article-form-title]').textContent='Edit article';
      document.querySelector('[data-image-requirement]').textContent='Leave empty to keep the current image';
      articleForm.querySelector('.primary-button').textContent='UPDATE ARTICLE';
      cancelArticle.hidden=false;
      articleForm.scrollIntoView({behavior:'smooth',block:'start'});
    }
    if(remove&&confirm('Delete this research article from the website?')){
      try{
        const result=await apiRequest('/api/research-articles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',id:remove.dataset.deleteArticle})});
        siteContent=result.content;renderAll();resetArticleForm();showPublished(result.commitSha);
      }catch(error){articleMessage.textContent=error.message;}
    }
  });

  cancelSection.addEventListener('click',resetSectionForm);
  cancelArticle.addEventListener('click',resetArticleForm);
  document.querySelector('[data-logout]').addEventListener('click',async()=>{
    await apiRequest('/api/logout',{method:'POST'}).catch(()=>{});
    location.replace('/exclusivelogin');
  });

  Promise.all([apiRequest('/api/session'),apiRequest('/api/content')]).then(([session,result])=>{
    document.querySelector('[data-session-user]').textContent=session.username;
    siteContent=result.content;
    resetArticleForm();
    renderAll();
  }).catch(error=>{status.textContent=error.message;});
})();
