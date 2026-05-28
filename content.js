(() => {
  const BUTTON_ID = "fd-copy-table-button";

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
          price: moneyToNumber(rawCost)
        };
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

  function createButton(table) {
    const wrapper = table.closest(".border") || table.parentElement;

    if (!wrapper) return;

    if (wrapper.querySelector(`#${BUTTON_ID}`)) return;

    const buttonRow = document.createElement("div");

    buttonRow.style.display = "flex";
    buttonRow.style.justifyContent = "flex-end";
    buttonRow.style.marginBottom = "12px";
    buttonRow.style.gap = "8px";

    const button = document.createElement("button");

    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "Copy FD";

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

      const json = JSON.stringify(items, null, 2);
      const copied = await copyText(json);

      if (!copied) {
        console.log("FD JSON:", json);
        alert("Copy blocked. JSON printed to console.");
        return;
      }

      button.textContent = `Copied ${items.length} item${items.length === 1 ? "" : "s"}`;

      setTimeout(() => {
        button.textContent = "Copy FD";
      }, 1800);
    });

    buttonRow.appendChild(button);
    wrapper.insertBefore(buttonRow, table);
  }

  function scanForTable() {
    const table = findFinancialTable();

    if (!table) return;

    createButton(table);
  }

  scanForTable();

  const observer = new MutationObserver(() => {
    scanForTable();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();