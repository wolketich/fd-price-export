(() => {
  const TABLE_BUTTON_ID = "fd-copy-table-button";
  const BASKET_BUTTON_ID = "fd-copy-basket-button";

  function moneyToNumber(value) {
    return Number(
      String(value || "")
        .replace(/[€£,\s]/g, "")
        .trim()
    ) || 0;
  }

  function formatSqm(sqm) {
    const rounded = Number(sqm.toFixed(2));

    return Number.isInteger(rounded)
      ? `${rounded}m2`
      : `${rounded.toFixed(2)}m2`;
  }

  function formatProductName(name) {
    return String(name || "")
      .replace(/Elite\s*70\s*Ovolo/i, "E70")
      .replace(/\s+/g, " ")
      .trim();
  }

  function formatCopiedItem({ quantity, productName, widthMm, heightMm, price }) {
    const sqmEach = (widthMm * heightMm) / 1000000;
    const sqmTotal = sqmEach * quantity;

    const measurementText = `${widthMm}mm by ${heightMm}mm`;
    const sqmText = formatSqm(sqmTotal);

    const printedDescription = `${productName} (${measurementText}) [${sqmText}]`;

    return {
      quantity,
      description: printedDescription,
      location: printedDescription,
      product: productName,
      widthMm,
      heightMm,
      squareMeters: Number(sqmTotal.toFixed(3)),
      size: measurementText,
      price
    };
  }

  function isFinancialTable(table) {
    const headers = [...table.querySelectorAll("thead th")]
      .map(th => th.innerText.trim().toLowerCase());

    return headers.includes("description") && headers.includes("cost");
  }

  function findFinancialTable() {
    const tables = [...document.querySelectorAll("table")];

    return tables.find(table => {
      if (table.classList.contains("table-pattern")) return isFinancialTable(table);
      return isFinancialTable(table);
    });
  }

  function parseFinancialTable(table) {
    const rows = [...table.querySelectorAll("tbody tr")];

    return rows
      .map(row => {
        const cells = [...row.querySelectorAll("td")];

        if (cells.length < 2) return null;

        const rawDescription = cells[0].innerText.trim();
        const rawCost = cells[1].innerText.trim();

        if (!rawDescription || !rawCost) return null;

        if (/^(subtotal|vat|total)$/i.test(rawDescription)) {
          return null;
        }

        const match = rawDescription.match(
          /^(\d+)\s*x\s*(.+?)\s+(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)$/i
        );

        if (!match) return null;

        const quantity = Number(match[1]) || 1;
        const productName = formatProductName(match[2]);
        const widthMm = Number(match[3]);
        const heightMm = Number(match[4]);
        const price = moneyToNumber(rawCost);

        return formatCopiedItem({
          quantity,
          productName,
          widthMm,
          heightMm,
          price
        });
      })
      .filter(Boolean);
  }

  function findBasketPanel() {
    const basketLinks = [...document.querySelectorAll("a")]
      .filter(link => {
        const text = link.innerText.trim().toLowerCase();
        const href = link.getAttribute("href") || "";

        return text.includes("show full basket") || href.includes("/basket");
      });

    for (const link of basketLinks) {
      const panel = link.closest(".absolute.inline-block.shadow-xl.bg-white");

      if (panel) return panel;
    }

    return null;
  }

  function parseBasketPanel(panel) {
    const sections = [...panel.children];

    return sections
      .map(section => {
        if (!(section instanceof HTMLElement)) return null;
        if (section.matches("strong, a, button")) return null;

        const sectionText = section.innerText || "";

        if (!sectionText.includes("Size:") || !sectionText.includes("Qty:")) {
          return null;
        }

        const topRow = section.querySelector(".flex.flex-wrap.justify-between.mb-3");

        if (!topRow) return null;

        const topStrong = [...topRow.querySelectorAll("strong")];

        if (topStrong.length < 2) return null;

        const productName = formatProductName(topStrong[0].innerText.trim());
        const price = moneyToNumber(topStrong[1].innerText.trim());

        const rows = [...section.querySelectorAll(".flex.flex-wrap.justify-between")];

        let sizeText = "";
        let quantity = 1;

        rows.forEach(row => {
          const label = row.querySelector("strong")?.innerText.trim().toLowerCase() || "";
          const value = row.querySelector("span")?.innerText.trim() || "";

          if (label.startsWith("size")) {
            sizeText = value;
          }

          if (label.startsWith("qty")) {
            quantity = Number(value) || 1;
          }
        });

        const sizeMatch = sizeText.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);

        if (!sizeMatch) return null;

        const widthMm = Number(sizeMatch[1]);
        const heightMm = Number(sizeMatch[2]);

        return formatCopiedItem({
          quantity,
          productName,
          widthMm,
          heightMm,
          price
        });
      })
      .filter(Boolean);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textarea = document.createElement("textarea");

      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      textarea.style.left = "-9999px";

      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const copied = document.execCommand("copy");

      textarea.remove();

      return copied;
    }
  }

  function setCopiedState(button, count) {
    button.textContent = `Copied ${count} item${count === 1 ? "" : "s"}`;

    setTimeout(() => {
      button.textContent = button.dataset.defaultText || "Copy FD";
    }, 1800);
  }

  function copyButtonClassList(button) {
    button.className = "btn btn-action w-full mt-3";
    button.style.cursor = "pointer";
  }

  function createTableButton(table) {
    const wrapper = table.closest(".border") || table.parentElement;

    if (!wrapper) return;

    if (wrapper.querySelector(`#${TABLE_BUTTON_ID}`)) return;

    const buttonRow = document.createElement("div");

    buttonRow.style.display = "flex";
    buttonRow.style.justifyContent = "flex-end";
    buttonRow.style.marginBottom = "12px";
    buttonRow.style.gap = "8px";

    const button = document.createElement("button");

    button.id = TABLE_BUTTON_ID;
    button.type = "button";
    button.textContent = "Copy FD";
    button.dataset.defaultText = "Copy FD";

    button.style.padding = "8px 12px";
    button.style.borderRadius = "6px";
    button.style.border = "1px solid #222";
    button.style.background = "#111";
    button.style.color = "#fff";
    button.style.fontSize = "14px";
    button.style.fontWeight = "600";
    button.style.cursor = "pointer";

    button.addEventListener("click", async () => {
      const items = parseFinancialTable(table);

      if (!items.length) {
        alert("No FD product rows found");
        return;
      }

      const copied = await copyText(JSON.stringify(items, null, 2));

      if (!copied) {
        console.log("FD table data:", items);
        alert("Copy blocked. Data printed to console.");
        return;
      }

      setCopiedState(button, items.length);
    });

    buttonRow.appendChild(button);
    wrapper.insertBefore(buttonRow, table);
  }

  function createBasketButton(panel) {
    if (panel.querySelector(`#${BASKET_BUTTON_ID}`)) return;

    const existingBasketLink = [...panel.querySelectorAll("a")]
      .find(link => {
        const text = link.innerText.trim().toLowerCase();
        const href = link.getAttribute("href") || "";

        return text.includes("show full basket") || href.includes("/basket");
      });

    const button = document.createElement("button");

    button.id = BASKET_BUTTON_ID;
    button.type = "button";
    button.textContent = "Copy FD Basket";
    button.dataset.defaultText = "Copy FD Basket";

    copyButtonClassList(button);

    button.addEventListener("click", async event => {
      event.preventDefault();
      event.stopPropagation();

      const items = parseBasketPanel(panel);

      if (!items.length) {
        alert("No basket items found");
        return;
      }

      const copied = await copyText(JSON.stringify(items, null, 2));

      if (!copied) {
        console.log("FD basket data:", items);
        alert("Copy blocked. Data printed to console.");
        return;
      }

      setCopiedState(button, items.length);
    });

    if (existingBasketLink) {
      panel.insertBefore(button, existingBasketLink);
    } else {
      panel.appendChild(button);
    }
  }

  function scanForTargets() {
    const table = findFinancialTable();

    if (table) {
      createTableButton(table);
    }

    const basketPanel = findBasketPanel();

    if (basketPanel) {
      createBasketButton(basketPanel);
    }
  }

  scanForTargets();

  const observer = new MutationObserver(() => {
    scanForTargets();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();