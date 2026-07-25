
    (function(){
    "use strict";

    /* ---------- Sidebar (mobile drawer) ---------- */
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('overlay');
    var menuToggle = document.getElementById('menuToggle');
    var sidebarClose = document.getElementById('sidebarClose');

    function openSidebar(){
        sidebar.classList.add('open');
        overlay.classList.add('open');
        menuToggle.setAttribute('aria-expanded','true');
        document.body.style.overflow = 'hidden';
    }
    function closeSidebar(){
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
        menuToggle.setAttribute('aria-expanded','false');
        document.body.style.overflow = '';
    }
    menuToggle.addEventListener('click', function(){
        sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
    sidebarClose.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', function(e){
        if(e.key === 'Escape') closeSidebar();
    });

    /* close drawer automatically if resized back to desktop */
    window.addEventListener('resize', function(){
        if(window.innerWidth > 860) closeSidebar();
    });

    /* ---------- Sidebar nav active state ---------- */
    var navLinks = document.querySelectorAll('[data-nav]');
    navLinks.forEach(function(link){
        link.addEventListener('click', function(){
        navLinks.forEach(function(l){ l.classList.remove('active'); l.removeAttribute('aria-current'); });
        link.classList.add('active');
        link.setAttribute('aria-current','page');
        if(window.innerWidth <= 860) closeSidebar();
        });
    });

    /* ---------- Dropdowns (notifications / user) ---------- */
    function setupDropdown(triggerId, dropdownId){
        var trigger = document.getElementById(triggerId);
        var dropdown = document.getElementById(dropdownId);
        trigger.addEventListener('click', function(e){
        e.stopPropagation();
        var isOpen = dropdown.classList.contains('open');
        closeAllDropdowns();
        if(!isOpen){
            dropdown.classList.add('open');
            trigger.setAttribute('aria-expanded','true');
        }
        });
        return { trigger: trigger, dropdown: dropdown };
    }
    var menus = [
        setupDropdown('notifTrigger','notifDropdown'),
        setupDropdown('userTrigger','userDropdown')
    ];
    function closeAllDropdowns(){
        menus.forEach(function(m){
        m.dropdown.classList.remove('open');
        m.trigger.setAttribute('aria-expanded','false');
        });
    }
    document.addEventListener('click', closeAllDropdowns);
    document.addEventListener('keydown', function(e){
        if(e.key === 'Escape') closeAllDropdowns();
    });

    /* ---------- Tabs filter ---------- */
    var tabButtons = document.querySelectorAll('.tab-btn');
    var cards = document.querySelectorAll('.course-card');
    var emptyState = document.getElementById('emptyState');
    var currentFilter = 'all';
    var currentSearch = '';

    function applyFilters(){
        var visibleCount = 0;
        cards.forEach(function(card){
        var status = card.getAttribute('data-status');
        var title = card.getAttribute('data-title').toLowerCase();
        var matchesFilter = currentFilter === 'all' || status === currentFilter;
        var matchesSearch = title.indexOf(currentSearch) !== -1;
        var show = matchesFilter && matchesSearch;
        card.style.display = show ? '' : 'none';
        if(show) visibleCount++;
        });
        emptyState.hidden = visibleCount !== 0;
    }

    tabButtons.forEach(function(btn){
        btn.addEventListener('click', function(){
        tabButtons.forEach(function(b){ b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
        btn.classList.add('active');
        btn.setAttribute('aria-selected','true');
        currentFilter = btn.getAttribute('data-filter');
        applyFilters();
        });
    });

    /* ---------- Search ---------- */
    var searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function(){
        currentSearch = searchInput.value.trim().toLowerCase();
        applyFilters();
    });

    /* ---------- Continue / Certificate actions ---------- */
    document.querySelectorAll('[data-continue]').forEach(function(btn){
        btn.addEventListener('click', function(){
        var name = btn.getAttribute('data-continue');
        btn.disabled = true;
        var original = btn.innerHTML;
        btn.textContent = 'Opening…';
        setTimeout(function(){
            btn.innerHTML = original;
            btn.disabled = false;
            alert('Resuming: ' + name);
        }, 500);
        });
    });
    document.querySelectorAll('[data-cert]').forEach(function(btn){
        btn.addEventListener('click', function(){
        alert('Opening certificate for: ' + btn.getAttribute('data-cert'));
        });
    });

    })();