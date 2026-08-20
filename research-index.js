(function initializeResearchIndex(){
  const list=document.querySelector('[data-research-list]');
  if(!list||!window.StarpowerContent)return;
  const formatDate=value=>new Intl.DateTimeFormat('en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(`${value}T00:00:00Z`));
  window.StarpowerContent.then(content=>{
    const articles=Array.isArray(content.researchArticles)?content.researchArticles:[];
    list.replaceChildren();
    if(!articles.length){
      const empty=document.createElement('p');
      empty.className='research-empty';
      empty.textContent='Research articles coming soon.';
      list.appendChild(empty);
      return;
    }
    articles.forEach(article=>{
      const card=document.createElement('article');
      card.className='research-card';
      const link=document.createElement('a');
      link.className='research-card-link';
      link.href=`research-article.html?article=${encodeURIComponent(article.slug)}`;
      const image=document.createElement('img');
      image.className='research-card-image';
      image.src=article.image;
      image.alt='';
      image.loading='lazy';
      image.decoding='async';
      const copy=document.createElement('div');
      copy.className='research-card-copy';
      const date=document.createElement('time');
      date.className='research-card-date';
      date.dateTime=article.date;
      date.textContent=formatDate(article.date);
      const title=document.createElement('h2');
      title.textContent=article.title;
      const subtitle=document.createElement('p');
      subtitle.textContent=article.subtitle;
      copy.append(date,title,subtitle);
      link.append(image,copy);
      card.appendChild(link);
      list.appendChild(card);
    });
  }).catch(()=>{
    list.textContent='Research articles could not be loaded.';
    list.classList.add('content-error');
  });
})();
