const floorImage = document.getElementById("floorImage");

if (floorImage) {

    // Current folder path
    const path = window.location.pathname;

    // Current folder name (floor_1, floor_2...)
    const folder = path.split("/").slice(-2, -1)[0];

    let baseName = "";

    if (folder === "lower_ground") {

        baseName = "Floor-LG";

    } else if (folder === "upper_ground") {

        baseName = "Floor-UG";

    } else {

        const number = folder.replace("floor_", "");

        baseName = `Floor-${number.padStart(2, "0")}`;

    }

    // Show WebP first
    floorImage.src = `${baseName}.webp`;

    // Load PNG in background
    const png = new Image();

    png.src = `${baseName}.png`;

    png.onload = () => {

        floorImage.style.transition = "opacity .25s";

        floorImage.style.opacity = "0";

        setTimeout(() => {

            floorImage.src = png.src;

            floorImage.onload = () => {

                floorImage.style.opacity = "1";

            };

        }, 250);

    };

}