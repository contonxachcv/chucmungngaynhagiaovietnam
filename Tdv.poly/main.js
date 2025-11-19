onload = () => {
    const c = setTimeout(() => {
        document.body.classList.remove("not-loaded");
        clearTimeout(c);
    }, 1000);
};

// --- Audio resume helpers (top-level so all contexts can use) ---
function getSavedResumeTime() {
    try {
        var t = sessionStorage.getItem('audio_resume_time');
        if (t == null) return null;
        var time = parseFloat(t);
        return isNaN(time) ? null : Math.max(0, time);
    } catch (_) { return null; }
}

function clearSavedResumeTimeSoon() {
    setTimeout(function () {
        try { sessionStorage.removeItem('audio_resume_time'); } catch (_) { }
    }, 10000); // clear in 10s to allow late gestures
}

function seekThen(action) {
    var audioEl = document.getElementById('myAudio');
    if (!audioEl) { if (typeof action === 'function') action(); return; }
    var resumeTime = getSavedResumeTime();
    var doAction = function () { if (typeof action === 'function') action(); };
    if (resumeTime != null) {
        var apply = function () {
            try { audioEl.currentTime = resumeTime; } catch (_) { }
            // after we started playing, clear saved time
            audioEl.addEventListener('playing', function once() {
                audioEl.removeEventListener('playing', once);
                clearSavedResumeTimeSoon();
            });
            doAction();
        };
        if (audioEl.readyState >= 1) apply();
        else audioEl.addEventListener('loadedmetadata', apply, { once: true });
    } else {
        doAction();
    }
}

$(document).ready(function () {
    var envelope = $("#envelope");
    var btn_open = $("#open");
    var btn_reset = $("#reset");
    var modal = $("#letter-modal");
    var typewriterContainer = $("#typewriter-text");
    var typingTimer;

    // Save audio position to resume on the next page
    function saveAudioResumeTime() {
        var audioEl = document.getElementById('myAudio');
        if (!audioEl) return;
        try {
            sessionStorage.setItem('audio_resume_time', String(audioEl.currentTime || 0));
            sessionStorage.setItem('audio_resume_ts', String(Date.now()));
        } catch (_) { /* ignore */ }
    }

    // Save when clicking the gift link
    $(document).on('click', "a[href='flower.html'], a[href$='flower.html']", function () {
        saveAudioResumeTime();
    });

    // Also save on page unload/navigation as a fallback
    window.addEventListener('beforeunload', saveAudioResumeTime);
    window.addEventListener('pagehide', saveAudioResumeTime);

     var letterLines = [
    "Nhân ngày Nhà giáo Việt Nam 20/11, em xin gửi đến thầy những lời tri ân sâu sắc nhất.",
    "Cảm ơn thầy vì đã dành cho chúng em không chỉ kiến thức, mà còn cả sự tận tâm, kiên nhẫn và tình yêu thương của một người làm nghề giáo.",
    "Mỗi bài giảng của thầy không chỉ giúp chúng em hiểu thêm về bài học, mà còn giúp chúng em hiểu hơn về cuộc sống và về chính bản thân mình.",
    "Thầy luôn là người truyền cảm hứng, là người động viên khi chúng em mất phương hướng, và là người nhắc nhở chúng em đứng dậy sau mỗi lần vấp ngã.",
    "Nhờ thầy, chúng em học được cách cố gắng nhiều hơn, sống có trách nhiệm hơn và biết trân trọng những giá trị thật sự quan trọng.",
    "Dù thời gian có trôi qua, những điều thầy dạy sẽ luôn ở lại trong chúng em như một phần hành trang quý giá.",
    "Nhân dịp này, em xin chúc thầy thật nhiều sức khỏe, niềm vui và luôn giữ vững ngọn lửa đam mê với nghề.",
    "Chúc thầy luôn gặp điều tốt đẹp, luôn hạnh phúc và luôn được trân trọng bởi những gì thầy đã cống hiến.",
    "Em cảm ơn thầy vì tất cả."
];


    envelope.click(function () {
        openEnvelope();
    });
    btn_open.click(function () {
        openEnvelope();
    });
    btn_reset.click(function () {
        closeEnvelope();
    });

    $("#close-modal").click(function () {
        closeModal();
    });

    $(".modal-backdrop").click(function () {
        closeModal();
    });

    $("#get-gift").click(function (e) {
        e.preventDefault();
        try { saveAudioResumeTime(); } catch (_) { }
        safePlay();
    });

    // Close handlers for flower overlay
    $(document).on('click', '#close-flowers', function (e) {
        e.preventDefault();
        var fc = $("#flower-container");
        fc.addClass('not-loaded').removeClass('active').hide();
        try { $('body').css('overflow', ''); } catch (_) { }
    });

    // Clicking the overlay background (not the inner .flowers) closes it
    $(document).on('click', '#flower-container', function (e) {
        if (e.target && e.target.id === 'flower-container') {
            var fc = $("#flower-container");
            fc.addClass('not-loaded').removeClass('active').hide();
            try { $('body').css('overflow', ''); } catch (_) { }
        }
    });

    function safePlay() {
        var audioEl = document.getElementById('myAudio');
        if (!audioEl) return;
        try {
            audioEl.muted = false;
            if (audioEl.volume === 0) audioEl.volume = 0.8;
            var p = audioEl.play();
            if (p && typeof p.then === 'function') {
                p.catch(function () { /* sẽ thử lại khi có gesture khác */ });
            }
        } catch (_) { /* bỏ qua */ }
    }

    function openEnvelope() {
        // cố gắng phát nhạc ngay khi có click mở thư
        safePlay();
        envelope.addClass("open").removeClass("close");
        // Mở modal sau khi envelope mở (0.5s delay)
        setTimeout(function () {
            showModal();
        }, 500);
    }

    function closeEnvelope() {
        envelope.addClass("close").removeClass("open");
        closeModal();
    }

    function showModal() {
        modal.fadeIn(300);
        startTypewriter();
    }

    function closeModal() {
        modal.fadeOut(300);
        stopTypewriter();
        typewriterContainer.html("");
    }

    function stopTypewriter() {
        if (typingTimer) {
            clearTimeout(typingTimer);
            typingTimer = null;
        }
    }

    function startTypewriter() {
        stopTypewriter();
        typewriterContainer.html('<span class="caret"></span>');

        var lineIndex = 0;
        var charIndex = 0;
        var currentLine = "";

        function typeNextChar() {
            if (lineIndex < letterLines.length) {
                currentLine = letterLines[lineIndex];

                if (charIndex < currentLine.length) {
                    var char = currentLine.charAt(charIndex);
                    var caretEl = typewriterContainer.find(".caret");
                    caretEl.before(char);
                    charIndex++;

                    var speed = char === ' ' ? 10 : 30 + Math.floor(Math.random() * 20);
                    typingTimer = setTimeout(typeNextChar, speed);
                } else {
                    // Xong một dòng, thêm <br> và chuyển sang dòng mới
                    var caretEl = typewriterContainer.find(".caret");
                    caretEl.before("<br>");
                    lineIndex++;
                    charIndex = 0;
                    typingTimer = setTimeout(typeNextChar, 200); // Delay giữa các dòng
                }
            }
        }

        typeNextChar();
    }

});

// unlock audio on first user gesture (required by browsers)
(function enableAudioOnFirstGesture() {
    var audioEl = document.getElementById('myAudio');
    if (!audioEl) return;

    var unlocked = false;
    function tryPlay() {
        if (unlocked) return;
        // seek first (if there is a saved time), then play
        seekThen(function () {
            audioEl.play().then(function () {
                unlocked = true;
                window.removeEventListener('click', tryPlay, true);
                window.removeEventListener('touchstart', tryPlay, true);
                window.removeEventListener('keydown', tryPlay, true);
            }).catch(function () {
                // ignore; will retry on next gesture
            });
        });
    }

    window.addEventListener('click', tryPlay, true);
    window.addEventListener('touchstart', tryPlay, true);
    window.addEventListener('keydown', tryPlay, true);
})();

// Try resuming audio from saved timestamp (across pages)
(function resumeAudioFromStorage() {
    var audioEl = document.getElementById('myAudio');
    if (!audioEl) return;
    try {
        audioEl.muted = false;
        if (audioEl.volume === 0) audioEl.volume = 0.8;
        // Always seek first (if saved), then attempt to play
        seekThen(function () {
            var p = audioEl.play();
            if (p && typeof p.then === 'function') { p.catch(function () { /* will retry on gesture */ }); }
        });
    } catch (_) { /* ignore */ }
})();

/* Generate extra long flowers by cloning an existing long-g template
   and randomizing position / scale. Cloned elements get the
   "extra-flower" class which has grow + sway animations in CSS. */
function generateLongFlowers(count) {
    try {
        var container = $('#flower-container .flowers');
        if (!container.length) return;
        // prefer an existing long-g template
        var template = container.find('.long-g').first();
        if (!template.length) template = container.find('.flower__g-long').first();
        if (!template.length) return;

        var isMobile = $('#flower-container').hasClass('mobile-simplified');
        var fragment = document.createDocumentFragment();

        for (var i = 0; i < count; i++) {
            var clone = template.clone(true)[0];
            clone.classList.add('extra-flower');
            if (isMobile) clone.classList.add('no-sway');

            var left = 8 + Math.floor(Math.random() * 84);
            var bottom = 6 + Math.floor(Math.random() * 18);
            var scale = (0.7 + Math.random() * 0.9).toFixed(2);
            var rot = (-8 + Math.random() * 16).toFixed(1);

            clone.style.cssText = 'position:absolute;left:' + left + '%;bottom:' + bottom + 'vmin;opacity:0;will-change:transform,opacity;backface-visibility:hidden';
            clone.style.transform = 'translateX(-50%) rotate(' + rot + 'deg) scale(' + scale + ')';

            var delay = (0.3 + Math.random() * (isMobile ? 0.6 : 1.2)).toFixed(2) + 's';
            clone.style.animationDelay = delay;

            fragment.appendChild(clone);
        }

        container[0].appendChild(fragment);
        // Trigger reflow and set opacity in one batch
        setTimeout(function () {
            var flowers = container.find('.extra-flower');
            flowers.css('opacity', '1');
        }, 10);
    } catch (e) {
        console.warn('generateLongFlowers failed', e);
    }
}

// Clone existing flower templates (.flower) to create additional mid-height flowers
function generateMoreFlowers(count) {
    try {
        var container = $('#flower-container .flowers');
        if (!container.length) return;
        var mobSimple = $('#flower-container').hasClass('mobile-simplified');
        // gather templates: prefer .flower elements (flower--1/2/3)
        var templates = container.find('.flower').toArray();
        // if none, fall back to long-g templates
        if (!templates.length) templates = container.find('.long-g, .flower__g-long').toArray();
        if (!templates.length) return;

        for (var i = 0; i < count; i++) {
            // pick a random template and clone
            var tpl = $(templates[Math.floor(Math.random() * templates.length)]);
            var clone = tpl.clone(true);
            clone.addClass('extra-flower');

            // even horizontal position across 6%..94%
            var left = (count > 1) ? (6 + (88 * (i / (count - 1)))) : 50;
            // baseline for mid flowers slightly higher than long ones
            var bottom = 8 + Math.floor(Math.random() * 20); // 8vmin..28vmin
            var scale = (0.6 + Math.random() * 0.9).toFixed(2);
            var rot = (-18 + Math.random() * 36).toFixed(1);

            clone.css({
                position: 'absolute',
                left: left + '%',
                bottom: bottom + 'vmin',
                opacity: 0,
                willChange: 'transform, opacity',
                backfaceVisibility: 'hidden'
            });
            clone.css('--rot', rot + 'deg');
            clone.css('--scale', scale);

            var delayBase = mobSimple ? 0.1 : 0.2;
            var delaySpan = mobSimple ? 0.5 : 1.8;
            var delay = (delayBase + Math.random() * delaySpan).toFixed(2) + 's';
            clone.css('animation-delay', delay);

            clone.css('--sway-dur', (mobSimple ? 2 + Math.random() * 1 : 3 + Math.random() * 3).toFixed(2) + 's');
            if (mobSimple) clone.addClass('no-sway');

            container.append(clone);
            (function (c) { setTimeout(function () { c.css('opacity', 1); }, 10); })(clone);
        }
    } catch (e) {
        console.warn('generateMoreFlowers failed', e);
    }
}

// Wrap original flowers' contents so outer can translateX(-50%) without breaking rotate animations
function wrapOriginalFlowers() {
    var container = $('#flower-container .flowers');
    if (!container.length) return;
    container.children('.flower').not('.extra-flower').each(function () {
        var $f = $(this);
        if ($f.data('wrapped')) return;
        // collect variant classes like flower--1/2/3
        var classes = ($f.attr('class') || '').split(/\s+/);
        var variant = classes.filter(function (c) { return /^flower--/.test(c); });
        var inner = $('<div class="flower-inner"></div>');
        if (variant.length) inner.addClass(variant.join(' '));
        // move children to inner
        inner.append($f.contents());
        $f.append(inner);
        // remove variant classes from outer
        if (variant.length) {
            $f.removeClass(variant.join(' '));
        }
        $f.data('wrapped', true);
    });
}

// Position the original .flower elements evenly across width (8%..92%)
function evenlyPositionOriginalFlowers() {
    var container = $('#flower-container .flowers');
    if (!container.length) return;
    var items = container.children('.flower').not('.extra-flower');
    var n = items.length;
    if (!n) return;
    items.each(function (idx) {
        var left = (n > 1) ? (8 + (84 * (idx / (n - 1)))) : 50;
        var $el = $(this);
        $el.css({ position: 'absolute', left: left + '%', right: 'auto', marginLeft: '' });
    });
}

// Recenter originals on window resize to avoid drift
$(window).on('resize', function () {
    evenlyPositionOriginalFlowers();
});
// On orientation change, also recenter
$(window).on('orientationchange', function () {
    evenlyPositionOriginalFlowers();
});

// Attach a pair of green leaves to each flower base using aesthetic similar to .flower__g-front__leaf
function addAttachedBranches() {
    var flowers = $('#flower-container .flowers .flower');
    flowers.each(function () {
        var $f = $(this);
        if ($f.data('branchesAdded')) return;
        var wrap = $('<div class="attach-branch" aria-hidden="true"></div>');
        wrap.append('<div class="attach-branch__leaf attach-branch__leaf--left"></div>');
        wrap.append('<div class="attach-branch__leaf attach-branch__leaf--right"></div>');
        $f.append(wrap);
        $f.data('branchesAdded', true);
    });
}
