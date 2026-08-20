(function initializePublishedContent(){
  const contentPromise=fetch('/content/site-content.json',{cache:'no-store'}).then(response=>{
    if(!response.ok)throw new Error('Published content could not be loaded.');
    return response.json();
  });
  window.StarpowerContent=contentPromise;

  function appendParagraphs(container,value){
    String(value||'').split(/\n\s*\n/).filter(Boolean).forEach(paragraph=>{
      const element=document.createElement('p');
      element.textContent=paragraph.trim();
      container.appendChild(element);
    });
  }

  function renderSections(content){
    const page=document.body.dataset.contentPage;
    const sections=content.pages?.[page]?.sections;
    const main=document.querySelector('main');
    if(!page||!main||!Array.isArray(sections)||!sections.length)return;
    const wrapper=document.createElement('section');
    wrapper.className='published-sections';
    wrapper.setAttribute('aria-label','Published page sections');
    sections.forEach(section=>{
      const article=document.createElement('article');
      article.className='published-section';
      const heading=document.createElement('div');
      const title=document.createElement('h2');
      title.textContent=section.title;
      heading.appendChild(title);
      if(section.subtitle){
        const subtitle=document.createElement('p');
        subtitle.className='published-subtitle';
        subtitle.textContent=section.subtitle;
        heading.appendChild(subtitle);
      }
      const copy=document.createElement('div');
      copy.className='published-copy';
      appendParagraphs(copy,section.body);
      article.append(heading,copy);
      wrapper.appendChild(article);
    });
    main.appendChild(wrapper);
  }

  contentPromise.then(renderSections).catch(()=>{});
})();
