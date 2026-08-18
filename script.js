
// SVG Path Links
// =============================

const floorLinks = {

    lowerGround: "svg/pages/Lower-Ground/Lower-Ground.html",
    ground: "svg/pages/Upper-Ground/Upper-Ground.html",
    floor1: "svg/pages/floor_1/floor_1.html",
    floor2: "svg/pages/floor_2/floor_2.html",
    floor3: "svg/pages/floor_3/floor_3.html",
    floor4: "svg/pages/floor_4/floor_4.html",
    floor5: "svg/pages/floor_5/floor_5.html",
    floor6: "svg/pages/floor_6/floor_6.html",
    floor7: "svg/pages/floor_7/floor_7.html",
    floor8: "svg/pages/floor_8/floor_8.html",
    floor9: "svg/pages/floor_9/floor_9.html",
    floor10: "svg/pages/floor_10/floor_10.html",
    floor11: "svg/pages/floor_11/floor_11.html",
    floor12: "svg/pages/floor_12/floor_12.html",
    floor13: "svg/pages/floor_13/floor_13.html",
    floor14: "svg/pages/floor_14/floor_14.html",
    floor15: "svg/pages/floor_15/floor_15.html",
    floor16: "svg/pages/floor_16/floor_16.html"

    // Add more here
    // floor6: "pages/floor6.html",
    // floor7: "pages/floor7.html",

};

// =============================
// Floor Names + Tooltip (desktop hover)
// Dummy category tags below — replace with
// real floor names whenever they're ready.
// =============================

const floorNames = {
    lowerGround: "Food & Beverages",
    ground: "Ground Floor — Retail Space, Anchor Store & F&B",
    floor1: "Floor 1 — Retail Space & Anchor Store",
    floor2: "Floor 2 — Anchor Store & Club House",
    floor3: "Floor 3 — Business Convention Center & Wellness Center",
    floor4: "Floor 4 — Presidential Offices",
    floor5: "Floor 5 — Boutique Offices",
    floor6: "Floor 6 — Boutique Offices",
    floor7: "Floor 7 — Boutique Offices",
    floor8: "Floor 8 — Boutique Offices",
    floor9: "Floor 9 — Boutique Offices",
    floor10: "Floor 10 — Boutique Offices",
    floor11: "Floor 11 — Presidential Offices",
    floor12: "Floor 12 — Penthouse Offices",
    floor13: "Floor 13 — Penthouse Offices",
    floor14: "Floor 14 — Penthouse Offices",
    floor15: "Floor 15 — Presidential Offices",
    floor16: "Floor 16 — Presidential Offices"
};

const floorTooltip = document.getElementById("tooltip");

// =============================
// Mobile Category Panels
// Each panel reveals only its own floors on the
// building SVG (mobile only, see CSS). Tapping a
// revealed floor still uses the same click handler
// below to navigate.
// =============================

const categoryGroups = {
    retail: ["floor1", "floor2"],
    club: ["floor3", "floor4"],
    presidential: ["floor5", "floor16", "floor17"],
    boutique: ["floor6", "floor7", "floor8", "floor9", "floor10", "floor11", "floor12"],
    penthouse: ["floor13", "floor14", "floor15"],
    // floor18 intentionally not included in any panel.
};

// =============================
// Attach Click Events
// =============================

Object.keys(floorLinks).forEach(id => {

    const path = document.getElementById(id);

    if (!path) {
        console.warn(`${id} not found.`);
        return;
    }

    path.addEventListener("click", () => {

        // Show the visitor registration form first.
        // Only after the visitor is approved & verified
        // does it redirect to the clicked floor page.
        if (typeof window.requestFloorAccess === "function") {

            window.requestFloorAccess(floorLinks[id]);

        } else {

            window.location.href = floorLinks[id];

        }

    });

    path.addEventListener("mouseenter", () => {
        path.style.fill = "rgba(255,215,0,.35)";
        path.style.stroke = "#FFD700";
        path.style.strokeWidth = "2";
    });

    path.addEventListener("mouseleave", () => {
        path.style.fill = "transparent";
        path.style.stroke = "transparent";
    });

    // Desktop hover tooltip (harmless on mobile too,
    // it just never fires since paths aren't hovered there).
    if (floorTooltip) {

        path.addEventListener("mousemove", (e) => {

            floorTooltip.style.display = "block";
            floorTooltip.style.left = e.pageX + 15 + "px";
            floorTooltip.style.top = e.pageY + 15 + "px";
            floorTooltip.innerHTML = `<strong>${floorNames[id] || id}</strong>`;

        });

        path.addEventListener("mouseleave", () => {
            floorTooltip.style.display = "none";
        });

    }

});

// =============================
// Mobile Category Panel Buttons
// =============================

(function () {

    const panelButtons = document.querySelectorAll(".category-btn");

    if (!panelButtons.length) return;

    function clearActivePanel() {

        document.querySelectorAll("#buildingSVG path.panel-active").forEach(p => {
            p.classList.remove("panel-active");
        });

        panelButtons.forEach(b => b.classList.remove("active"));

    }

    panelButtons.forEach(btn => {

        btn.addEventListener("click", () => {

            const key = btn.dataset.panel;
            const isAlreadyActive = btn.classList.contains("active");

            clearActivePanel();

            // Tapping the already-active panel again just
            // closes it back to the default (nothing shown).
            if (isAlreadyActive) return;

            const floors = categoryGroups[key] || [];

            floors.forEach(floorId => {

                const path = document.getElementById(floorId);

                if (path) path.classList.add("panel-active");

            });

            btn.classList.add("active");

        });

    });

})();