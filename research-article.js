(function initializeResearchArticle(){
  const container=document.querySelector('[data-research-article]');
  if(!container||!window.StarpowerContent)return;
  const slug=new URLSearchParams(location.search).get('article');
  const formatDate=value=>new Intl.DateTimeFormat('en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(`${value}T00:00:00Z`));
  window.StarpowerContent.then(content=>{
    const article=content.researchArticles?.find(item=>item.slug===slug);
    if(!article)throw new Error('Article not found.');
    document.title=`${article.title} — Starpower Research`;
    container.replaceChildren();
    const date=document.createElement('time');
    date.className='article-date';
    date.dateTime=article.date;
    date.textContent=formatDate(article.date);
    const title=document.createElement('h1');
    title.textContent=article.title;
    const subtitle=document.createElement('p');
    subtitle.className='article-subtitle';
    subtitle.textContent=article.subtitle;
    const image=document.createElement('img');
    image.className='article-image';
    image.src=article.image;
    image.alt='';
    const body=document.createElement('div');
    body.className='article-body';
    String(article.body||'').split(/\n\s*\n/).filter(Boolean).forEach(value=>{
      const paragraph=document.createElement('p');
      paragraph.textContent=value.trim();
      body.appendChild(paragraph);
    });
    container.append(date,title,subtitle,image,body);
  }).catch(()=>{
    container.textContent='This research article could not be found.';
    container.classList.add('content-error');
  });
})();
