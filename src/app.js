/**
 * NEXCORE E-Commerce Application
 * Vanilla JS Implementation
 */

// Application State
const state = {
  products: [],
  filteredProducts: [],
  searchQuery: '',
  activeCategories: new Set(),
  sortBy: 'popularity', // 'popularity', 'price-asc', 'price-desc'
  currentSlide: 0
};

// 1. Initialization - Entry Point
async function init() {
  try {
    // Add cache buster to ensure latest JSON is fetched
    const response = await fetch('src/products.json?v=' + new Date().getTime());
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    state.products = data;
    state.filteredProducts = [...data];

    setupEventListeners();
    filterProducts();
    startCarousel();
  } catch (error) {
    console.error('Error fetching products:', error);
    const grid = document.getElementById('product-grid');
    if (grid) {
      grid.innerHTML = '<div class="no-results" style="grid-column: 1 / -1; text-align: center;">Failed to load products. Please check your connection and try again later.</div>';
    }
  }
}

// 2. Format Price - Indian Rupee Formatter
function formatPrice(num) {
  if (typeof num !== 'number') return num;
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(num);
}

function formatPriceFull(num) {
  if (typeof num !== 'number') return num;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
}

// 3. Get Image URL - Direct Cloudinary URL
function getImageUrl(rawUrl) {
  if (!rawUrl) return '';
  return rawUrl;
}

// 4. Handle Image Error - Global Scope for inline HTML use
window.handleImageError = function(img) {
  if (img.dataset.errorHandled === 'true') return;
  img.dataset.errorHandled = 'true';
  
  // Generic PC component SVG fallback
  const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
    <rect x="9" y="9" width="6" height="6"></rect>
    <line x1="9" y1="1" x2="9" y2="4"></line>
    <line x1="15" y1="1" x2="15" y2="4"></line>
    <line x1="9" y1="20" x2="9" y2="23"></line>
    <line x1="15" y1="20" x2="15" y2="23"></line>
    <line x1="20" y1="9" x2="23" y2="9"></line>
    <line x1="20" y1="14" x2="23" y2="14"></line>
    <line x1="1" y1="9" x2="4" y2="9"></line>
    <line x1="1" y1="14" x2="4" y2="14"></line>
  </svg>`;
  
  img.src = fallbackSvg;
  img.alt = 'Product Image';
};

// 5. Filter Products - Core Logic
function filterProducts() {
  let result = state.products;

  // Filter by Search Query
  if (state.searchQuery.trim() !== '') {
    const queries = state.searchQuery.toLowerCase().split(/\s+/).filter(q => q.length > 0);
    
    result = result.filter(p => {
      let score = 0;
      queries.forEach(query => {
        if (p.title && p.title.toLowerCase().includes(query)) score += 10;
        if (p.category && p.category.toLowerCase().includes(query)) score += 5;
        if (p.brand && p.brand.toLowerCase().includes(query)) score += 5;
        if (p.description && p.description.toLowerCase().includes(query)) score += 1;
      });
      p._searchScore = score;
      return score > 0;
    });
  } else {
    // Reset scores when no search is active
    result.forEach(p => p._searchScore = 0);
  }

  // Filter by Active Categories
  if (state.activeCategories.size > 0) {
    result = result.filter(p => state.activeCategories.has(p.category));
  }

  // Sort Results
  result.sort((a, b) => {
    // 1. Primary Sort: Search Accuracy (Score)
    if (state.searchQuery.trim() !== '') {
      const scoreDiff = (b._searchScore || 0) - (a._searchScore || 0);
      if (scoreDiff !== 0) return scoreDiff;
    }

    // 2. Secondary Sort: User Selection
    if (state.sortBy === 'popularity') {
      return (b.popularity || 0) - (a.popularity || 0);
    } else if (state.sortBy === 'price-asc') {
      return (a.price || 0) - (b.price || 0);
    } else if (state.sortBy === 'price-desc') {
      return (b.price || 0) - (a.price || 0);
    }
    return 0;
  });

  state.filteredProducts = result;
  
  // Update Product Count
  const countElement = document.getElementById('product-count');
  const toolbarCount = document.getElementById('toolbar-product-count');
  if (countElement) {
    countElement.textContent = result.length;
  }
  if (toolbarCount) {
    toolbarCount.textContent = result.length;
  }

  renderProducts();
}

// 6. Render Products - DOM Manipulation
function renderProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  grid.innerHTML = '';

  if (state.filteredProducts.length === 0) {
    grid.innerHTML = '<div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">No products found. Try adjusting your filters.</div>';
    return;
  }

  const whatsappIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

  // Create style element for keyframes if not exists
  if (!document.getElementById('fade-in-style')) {
    const style = document.createElement('style');
    style.id = 'fade-in-style';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  state.filteredProducts.forEach(function(product, index) {
    var categorySlug = (product.category || 'misc').toLowerCase().replace(/\s+/g, '-');
    var proxiedUrl = getImageUrl(product.image);
    var priceFormatted = formatPrice(product.price);
    var mrpFormatted = formatPrice(product.mrp);
    
    // Staggered animation
    var animationDelay = Math.min(index * 0.05, 0.5);

    var card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = product.id;
    card.style.animation = 'fadeIn 0.4s ease forwards ' + animationDelay + 's';
    card.style.opacity = '0';

    card.innerHTML = '<span class="card-badge badge-' + categorySlug + '">' + (product.category || 'Hardware') + '</span>' +
      '<div class="card-image">' +
        '<img src="' + proxiedUrl + '" alt="' + product.title + '" loading="lazy" onerror="handleImageError(this)">' +
      '</div>' +
      '<div class="card-body">' +
        '<span class="card-brand">' + (product.brand || 'NEXCORE') + '</span>' +
        '<h3 class="card-title">' + product.title + '</h3>' +
        '<div class="card-stock">' +
          '<span class="stock-dot"></span>' +
          '<span>In Stock - Ready to Ship</span>' +
        '</div>' +
        '<div class="card-price">' +
          '<span class="price-current">' + priceFormatted + '</span>' +
          '<span class="price-mrp">' + mrpFormatted + '</span>' +
          '<span class="price-gst">Incl. GST</span>' +
        '</div>' +
        '<div class="card-action">' +
          '<button class="btn btn-buy" onclick="openBuyModal(\'' + product.id + '\')">' +
            whatsappIcon +
            ' Buy via WhatsApp' +
          '</button>' +
        '</div>' +
      '</div>';

    grid.appendChild(card);
  });
}

// 7. Setup Event Listeners
function setupEventListeners() {
  // Global & Sidebar Search
  const globalSearch = document.getElementById('global-search');
  const sidebarSearch = document.getElementById('sidebar-search');

  const onSearch = (e) => {
    state.searchQuery = e.target.value;
    
    // Sync both inputs
    if (globalSearch && e.target !== globalSearch) globalSearch.value = state.searchQuery;
    if (sidebarSearch && e.target !== sidebarSearch) sidebarSearch.value = state.searchQuery;
    
    filterProducts();
  };

  if (globalSearch) globalSearch.addEventListener('input', onSearch);
  if (sidebarSearch) sidebarSearch.addEventListener('input', onSearch);

  // Category Tabs
  const categoryTabs = document.querySelectorAll('#category-tabs .category-tab');
  const categoryCheckboxes = document.querySelectorAll('.category-filter');

  categoryTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const category = tab.dataset.category;
      const isAll = category === 'all';

      state.activeCategories.clear();
      if (!isAll) {
        state.activeCategories.add(category);
      }

      // Update Tab Visuals
      categoryTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Sync Checkboxes
      categoryCheckboxes.forEach(cb => {
        cb.checked = state.activeCategories.has(cb.value);
      });

      filterProducts();
    });
  });

  // Sidebar Category Checkboxes
  categoryCheckboxes.forEach(cb => {
    cb.addEventListener('change', (e) => {
      if (e.target.checked) {
        state.activeCategories.add(e.target.value);
      } else {
        state.activeCategories.delete(e.target.value);
      }

      // Sync Tabs
      categoryTabs.forEach(t => t.classList.remove('active'));
      
      if (state.activeCategories.size === 1) {
        const activeCat = Array.from(state.activeCategories)[0];
        const tab = Array.from(categoryTabs).find(t => t.dataset.category === activeCat);
        if (tab) tab.classList.add('active');
      } else if (state.activeCategories.size === 0) {
        const allTab = Array.from(categoryTabs).find(t => t.dataset.category === 'all');
        if (allTab) allTab.classList.add('active');
      }

      filterProducts();
    });
  });

  // Sort Select
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      filterProducts();
    });
  }

  // Carousel Controls
  const prevArrow = document.querySelector('.carousel-arrow.prev');
  const nextArrow = document.querySelector('.carousel-arrow.next');
  const dots = document.querySelectorAll('.carousel-dot');

  if (prevArrow) {
    prevArrow.addEventListener('click', () => {
      window.goToSlide(state.currentSlide - 1);
    });
  }
  if (nextArrow) {
    nextArrow.addEventListener('click', () => {
      window.goToSlide(state.currentSlide + 1);
    });
  }
  
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      window.goToSlide(index);
    });
  });

  // Mobile Sidebar Toggle
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarOverlay = document.querySelector('.sidebar-overlay');
  const sidebarCloseBtn = document.querySelector('.sidebar-close-btn');
  
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-open');
    });
  }
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      document.body.classList.remove('sidebar-open');
    });
  }
  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', () => {
      document.body.classList.remove('sidebar-open');
    });
  }

  // Modal Overlay & Close bindings
  const modalClose = document.querySelector('.modal-close');
  const modalOverlay = document.querySelector('#buy-modal .modal-overlay') || document.querySelector('.modal-overlay');

  if (modalClose) {
    modalClose.addEventListener('click', closeBuyModal);
  }
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeBuyModal();
      }
    });
  }

  // Global Escape key support for Modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeBuyModal();
    }
  });
}

// 8. Open Buy Modal
window.openBuyModal = function(productId) {
  // Find product by comparing IDs (support both string/num matching)
  const product = state.products.find(p => String(p.id) === String(productId));
  if (!product) return;

  const modalImg = document.getElementById('modal-product-image');
  const modalTitle = document.getElementById('modal-product-title');
  const modalPrice = document.getElementById('modal-product-price');
  const whatsappLink = document.getElementById('whatsapp-order-link');
  const modalOverlay = document.querySelector('#buy-modal .modal-overlay') || document.querySelector('.modal-overlay');

  const formattedPrice = formatPriceFull(product.price);

  if (modalImg) {
    modalImg.src = getImageUrl(product.image);
    modalImg.alt = product.title;
  }
  if (modalTitle) modalTitle.textContent = product.title;
  if (modalPrice) modalPrice.textContent = formattedPrice;

  if (whatsappLink) {
    const phone = '918796860630';
    const messageText = `Hi NEXCORE, I am interested in buying ${product.title} priced at ${formattedPrice}. Is this available?`;
    whatsappLink.href = `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`;
  }

  if (modalOverlay) {
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }
};

// 9. Close Buy Modal
window.closeBuyModal = function() {
  const modalOverlay = document.querySelector('#buy-modal .modal-overlay') || document.querySelector('.modal-overlay');
  if (modalOverlay) {
    modalOverlay.classList.remove('active');
  }
  document.body.style.overflow = ''; // Re-enable background scrolling
};

// 10. Start Carousel
function startCarousel() {
  const slidesContainer = document.querySelector('.carousel-slides');
  const dotsContainer = document.querySelector('.carousel-dots');
  if (!slidesContainer || !dotsContainer) return;

  // Inject random product images into all 9 slides (6 desktop + 3 mobile features)
  if (state.products && state.products.length >= 9) {
    const productsWithImages = state.products.filter(p => p.image);
    if (productsWithImages.length >= 9) {
      const shuffled = productsWithImages.sort(() => 0.5 - Math.random());
      
      const slidesData = [
        { selector: '.slide-1', img: shuffled[0].image, color: '13, 27, 42' },
        { selector: '.slide-2', img: shuffled[1].image, color: '10, 46, 26' },
        { selector: '.slide-3', img: shuffled[2].image, color: '46, 10, 10' },
        { selector: '.slide-4', img: shuffled[3].image, color: '30, 15, 50' },
        { selector: '.slide-5', img: shuffled[4].image, color: '10, 30, 50' },
        { selector: '.slide-6', img: shuffled[5].image, color: '15, 45, 50' },
        { selector: '.slide-feature-warranty', img: shuffled[6].image, color: '13, 40, 24' },
        { selector: '.slide-feature-pickup', img: shuffled[7].image, color: '26, 42, 61' },
        { selector: '.slide-feature-delivery', img: shuffled[8].image, color: '58, 42, 13' },
      ];
      
      slidesData.forEach(data => {
        const slide = document.querySelector(data.selector);
        if (slide) {
          slide.style.backgroundImage = `linear-gradient(to right, rgba(${data.color}, 0.95) 0%, rgba(${data.color}, 0.7) 40%, rgba(${data.color}, 0.1) 100%), url('${data.img}')`;
          slide.style.backgroundSize = 'cover';
          slide.style.backgroundPosition = 'center right';
        }
      });
    }
  }

  // Count only VISIBLE slides (display !== 'none')
  function getVisibleSlides() {
    const allSlides = slidesContainer.querySelectorAll('.carousel-slide');
    return Array.from(allSlides).filter(s => getComputedStyle(s).display !== 'none');
  }

  function rebuildDots(count) {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('button');
      dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      dot.dataset.slide = i;
      dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      dot.addEventListener('click', () => {
        stopAutoRotate();
        goToSlide(i);
        startAutoRotate();
      });
      dotsContainer.appendChild(dot);
    }
  }

  let visibleSlides = getVisibleSlides();
  let totalSlides = visibleSlides.length;
  rebuildDots(totalSlides);

  let autoRotateInterval;

  function goToSlide(index) {
    visibleSlides = getVisibleSlides();
    totalSlides = visibleSlides.length;

    if (index < 0) {
      state.currentSlide = totalSlides - 1;
    } else if (index >= totalSlides) {
      state.currentSlide = 0;
    } else {
      state.currentSlide = index;
    }

    // Calculate the actual DOM index of the target visible slide
    const allSlides = slidesContainer.querySelectorAll('.carousel-slide');
    const targetSlide = visibleSlides[state.currentSlide];
    let domIndex = Array.from(allSlides).indexOf(targetSlide);

    slidesContainer.style.transform = 'translateX(-' + (domIndex * 100) + '%)';

    // Update dots
    const dots = dotsContainer.querySelectorAll('.carousel-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === state.currentSlide);
    });
  }

  window.goToSlide = goToSlide;

  const startAutoRotate = () => {
    autoRotateInterval = setInterval(() => {
      goToSlide(state.currentSlide + 1);
    }, 3000); // reduced from 5000 to 3000 for faster scroll
  };

  const stopAutoRotate = () => {
    clearInterval(autoRotateInterval);
  };

  // Touch Swipe Logic
  let touchStartX = 0;
  let touchEndX = 0;
  
  if (slidesContainer) {
    slidesContainer.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
      stopAutoRotate();
    }, {passive: true});
    
    slidesContainer.addEventListener('touchend', e => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
      startAutoRotate();
    }, {passive: true});
  }

  function handleSwipe() {
    if (touchEndX < touchStartX - 40) goToSlide(state.currentSlide + 1);
    if (touchEndX > touchStartX + 40) goToSlide(state.currentSlide - 1);
  }

  // Bind pause on hover
  const heroCarousel = document.querySelector('.hero-carousel');
  if (heroCarousel) {
    heroCarousel.addEventListener('mouseenter', stopAutoRotate);
    heroCarousel.addEventListener('mouseleave', startAutoRotate);
  }

  // Rebuild on resize (desktop <-> mobile transition)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      visibleSlides = getVisibleSlides();
      totalSlides = visibleSlides.length;
      rebuildDots(totalSlides);
      state.currentSlide = 0;
      goToSlide(0);
    }, 250);
  });

  // Initialize
  goToSlide(0);
  startAutoRotate();
}

// 11. Kickoff Initialization
document.addEventListener('DOMContentLoaded', init);
