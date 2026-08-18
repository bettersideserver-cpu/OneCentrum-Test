// ==========================================
// floor-nav.js
// Adds Up / Down floor navigation + Back to
// Building button to every floor page.
// Order goes from Lower Ground (bottom) to
// Floor 18 (top).
// ==========================================

(function () {

    const FLOORS = [
        { name: "Lower Ground", path: "Lower-Ground/Lower-Ground.html" },
        { name: "Ground", path: "Upper-Ground/Upper-Ground.html" },

        { name: "Floor 1", path: "floor_1/floor_1.html" },
        { name: "Floor 2", path: "floor_2/floor_2.html" },
        { name: "Floor 3", path: "floor_3/floor_3.html" },
        { name: "Floor 4", path: "floor_4/floor_4.html" },
        { name: "Floor 5", path: "floor_5/floor_5.html" },
        { name: "Floor 6", path: "floor_6/floor_6.html" },
        { name: "Floor 7", path: "floor_7/floor_7.html" },
        { name: "Floor 8", path: "floor_8/floor_8.html" },
        { name: "Floor 9", path: "floor_9/floor_9.html" },
        { name: "Floor 10", path: "floor_10/floor_10.html" },
        { name: "Floor 11", path: "floor_11/floor_11.html" },
        { name: "Floor 12", path: "floor_12/floor_12.html" },
        { name: "Floor 13", path: "floor_13/floor_13.html" },
        { name: "Floor 14", path: "floor_14/floor_14.html" },
        { name: "Floor 15", path: "floor_15/floor_15.html" },
        { name: "Floor 16", path: "floor_16/floor_16.html" }
    ];


    function getCurrentIndex() {

        const pathname = window.location.pathname.replace(/\\/g, "/");

        for (let i = 0; i < FLOORS.length; i++) {

            if (pathname.endsWith("/" + FLOORS[i].path) || pathname.endsWith(FLOORS[i].path)) {
                return i;
            }

        }

        return -1;

    }

    function goToFloor(index) {

        if (index < 0 || index >= FLOORS.length) return;

        // Every floor page lives one folder below /svg/pages/,
        // so we go up one level then into the target floor folder.
        window.location.href = "../" + FLOORS[index].path;

    }

    function init() {

        const currentIndex = getCurrentIndex();

        if (currentIndex === -1) {
            console.warn("floor-nav: could not determine current floor.");
            return;
        }

        // ---------- Back to Building ----------

        const backBtn = document.createElement("a");
        backBtn.id = "backToBuildingBtn";
        backBtn.href = "../../../index.html";
        backBtn.innerHTML = "&#8592; Building";
        document.body.appendChild(backBtn);

        // ---------- Up / Down Floor Switcher ----------

        const nav = document.createElement("div");
        nav.id = "floorNav";

        const isTop = currentIndex === FLOORS.length - 1;
        const isBottom = currentIndex === 0;

        nav.innerHTML = `
    <button id="floorUpBtn" title="Go Up" ${isTop ? "disabled" : ""}>&#9650;</button>

    <select id="floorSelect">
        ${FLOORS.map((floor, i) => `
            <option value="${i}" ${i === currentIndex ? "selected" : ""}>
                ${floor.name}
            </option>
        `).join("")}
    </select>

    <button id="floorDownBtn" title="Go Down" ${isBottom ? "disabled" : ""}>&#9660;</button>
`;

        document.body.appendChild(nav);

        document.getElementById("floorSelect").addEventListener("change", (e) => {
            goToFloor(parseInt(e.target.value, 10));
        });

        document.getElementById("floorUpBtn").addEventListener("click", () => {
            goToFloor(currentIndex + 1);
        });

        document.getElementById("floorDownBtn").addEventListener("click", () => {
            goToFloor(currentIndex - 1);
        });

        // ---------- Keyboard Shortcuts ----------

        document.addEventListener("keydown", (e) => {

            if (e.key === "ArrowUp" || e.key === "PageUp") {
                e.preventDefault();
                goToFloor(currentIndex + 1);
            }

            if (e.key === "ArrowDown" || e.key === "PageDown") {
                e.preventDefault();
                goToFloor(currentIndex - 1);
            }

        });

    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
