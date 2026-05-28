export class HUD {
  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 40px;
      font-family: 'Segoe UI', Arial, sans-serif;
      color: white;
      pointer-events: none;
      z-index: 100;
    `;

    // Speed display
    this.speedBox = this._createBox('SPEED', '0', 'km/h');
    this.container.appendChild(this.speedBox);

    document.body.appendChild(this.container);
  }

  _createBox(label, value, unit) {
    const box = document.createElement('div');
    box.style.cssText = `
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      padding: 12px 24px;
      text-align: center;
      min-width: 100px;
    `;

    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size: 11px;
      letter-spacing: 2px;
      color: rgba(255, 255, 255, 0.5);
      margin-bottom: 4px;
    `;

    const valueRow = document.createElement('div');
    valueRow.style.cssText = `
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 4px;
    `;

    const valueEl = document.createElement('span');
    valueEl.id = 'hud-speed-value';
    valueEl.textContent = value;
    valueEl.style.cssText = `
      font-size: 36px;
      font-weight: 700;
      line-height: 1;
    `;

    const unitEl = document.createElement('span');
    unitEl.textContent = unit;
    unitEl.style.cssText = `
      font-size: 13px;
      color: rgba(255, 255, 255, 0.5);
    `;

    valueRow.appendChild(valueEl);
    valueRow.appendChild(unitEl);

    box.appendChild(labelEl);
    box.appendChild(valueRow);
    return box;
  }

  update(car) {
    const speedKmh = Math.abs(car.speed) * 3.6;
    const valueEl = document.getElementById('hud-speed-value');
    if (valueEl) {
      valueEl.textContent = Math.round(speedKmh).toString();
    }
  }
}
