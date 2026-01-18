let mana = 0;
let manaPerSecond = 0;
let upgradeCost = 10;


let upgradeTiers = [];

async function loadUpgradeData() {
  const response = await fetch("upgrades.json");
  const data = await response.json();
  upgradeTiers = data.tiers;
}

function startGame() {
  generateUpgradeUI();
  requestAnimationFrame(gameLoop);
}



loadUpgradeData().then(startGame);

let lastTime = performance.now();

const manaEl = document.getElementById("mana");
const mpsEl = document.getElementById("mps");
const clickBtn = document.getElementById("clickBtn");

function format(value) {
    const SCI_THRESHOLD = 1e6;

    if (Math.abs(value) < SCI_THRESHOLD) {
        if (value < 1) return value.toFixed(2);
        return Math.floor(value).toString();
    }

    const exponent = Math.floor(Math.log10(Math.abs(value)));
    const mantissa = value / Math.pow(10, exponent);

    return mantissa.toFixed(2) + "e" + exponent;
}

function generateUpgradeUI() {
  const tabsEl = document.getElementById("upgrade-tabs");
  const panelsEl = document.getElementById("upgrade-panels");

  tabsEl.innerHTML = "";
  panelsEl.innerHTML = "";

  upgradeTiers.forEach((tier, index) => {
    // Create tab
    const tab = document.createElement("button");
    tab.className = "tab" + (index === 0 ? " active" : "");
    tab.textContent = toRoman(tier.id);
    tab.dataset.tab = tier.id;
    tabsEl.appendChild(tab);

    // Create panel
    const panel = document.createElement("div");
    panel.className = "box upgrade-panel" + (index === 0 ? " active" : "");
    panel.dataset.panel = tier.id;

    const title = document.createElement("h3");
    title.textContent = tier.name;
    title.style.margin = "0 0 5px 0";
    panel.appendChild(title);

    if (tier.upgrades.length === 0) {
      const locked = document.createElement("p");
      locked.textContent = "Locked";
      panel.appendChild(locked);
    } else {
      tier.upgrades.forEach(upg => {
        const btn = document.createElement("button");
        btn.textContent = `${upg.name} (${upg.cost})`;
        panel.appendChild(btn);
      });
    }

    panelsEl.appendChild(panel);
  });

  // add tab switching logic
  tabsEl.addEventListener("click", e => {
    if (!e.target.classList.contains("tab")) return;

    const id = e.target.dataset.tab;

    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".upgrade-panel").forEach(p => p.classList.remove("active"));

    e.target.classList.add("active");
    document.querySelector(`.upgrade-panel[data-panel="${id}"]`).classList.add("active");
  });
}


clickBtn.onclick = () => {
    mana += 1;
};

upgradeBtn.onclick = () => {
    if (mana >= upgradeCost) {
        mana -= upgradeCost;
        manaPerSecond += 1;
        upgradeCost = Math.floor(upgradeCost * 1.5);
        upgradeBtn.textContent = `Buy Upgrade (Cost: ${format(upgradeCost)})`;
    }
};

function gameLoop(time) {
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    mana += manaPerSecond * delta;

    manaEl.textContent = format(Math.floor(mana));
    mpsEl.textContent = format(manaPerSecond);

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);



function toRoman(num) {
    const roman = [
        ["M", 1000],
        ["CM", 900],
        ["D", 500],
        ["CD", 400],
        ["C", 100],
        ["XC", 90],
        ["L", 50],
        ["XL", 40],
        ["X", 10],
        ["IX", 9],
        ["V", 5],
        ["IV", 4],
        ["I", 1]
    ];

    let result = "";
    let n = num;

    for (const [symbol, value] of roman) {
        while (n >= value) {
            result += symbol;
            n -= value;
        }
    }

    return result;
}
