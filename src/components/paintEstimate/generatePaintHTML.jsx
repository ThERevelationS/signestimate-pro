export function generatePaintEstimateHTML(project, totals, formatPaintVolume) {
  const { totalPaintMask, totalLiquidPaintAndSupplies, totalLabor, totalLaborHours, totalGallonsNeeded, numberOfMixes, mixingHours, setupHours, uniqueColorCount, totalColorChangeHours, totalPaintGunCleaningHours, fixedWasteGallons } = totals;
  const totalCost = totalPaintMask + totalLiquidPaintAndSupplies + totalLabor;
  const laborRate = project.globalLaborRate || 60;

  return `<!DOCTYPE html>
<html>
<head>
  <title>Paint Estimate - ${project.project_name}</title>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; color: #1e293b; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); min-height: 100vh; }
    .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 40px; text-align: center; }
    .header h1 { font-size: 32px; font-weight: 700; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; }
    .project-info { padding: 30px 40px; background: #f8fafc; border-bottom: 3px solid #e2e8f0; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .info-item { display: flex; align-items: center; gap: 8px; }
    .info-label { font-weight: 600; color: #64748b; font-size: 13px; }
    .info-value { color: #1e293b; font-size: 13px; }
    .content { padding: 40px; }
    .section-title { font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 25px; padding-bottom: 10px; border-bottom: 3px solid #3b82f6; display: inline-block; }
    .item { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 20px; }
    .item-header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 12px 20px; border-radius: 8px; margin: -25px -25px 20px -25px; font-weight: 600; font-size: 16px; }
    .item-details { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 15px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .detail-label { font-weight: 600; color: #64748b; font-size: 13px; }
    .detail-value { color: #1e293b; font-weight: 500; font-size: 13px; }
    .paint-volume-highlight { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 2px solid #3b82f6; border-radius: 8px; padding: 12px; margin: 15px 0; }
    .paint-volume-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #1e40af; font-weight: 600; margin-bottom: 5px; }
    .paint-volume-value { font-size: 16px; font-weight: 700; color: #1e40af; }
    .item-costs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 20px; padding-top: 20px; border-top: 2px dashed #cbd5e1; }
    .cost-box { background: white; padding: 15px; border-radius: 8px; border: 2px solid #e2e8f0; }
    .cost-box.mask { border-color: #8b5cf6; background: linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%); }
    .cost-box.paint { border-color: #6366f1; background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); }
    .cost-box.labor { border-color: #10b981; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); }
    .cost-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; margin-bottom: 5px; }
    .cost-value { font-size: 20px; font-weight: 700; color: #1e293b; }
    .summary { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 3px solid #e2e8f0; border-radius: 16px; padding: 30px; margin-top: 40px; }
    .summary-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
    .summary-row:last-child { border-bottom: none; }
    .summary-label { font-weight: 600; color: #475569; font-size: 15px; }
    .summary-value { font-weight: 700; color: #1e293b; font-size: 15px; }
    .summary-row.volume { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 2px solid #3b82f6; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
    .summary-row.volume .summary-label { color: #1e40af; font-size: 13px; }
    .summary-row.volume .summary-value { color: #1e40af; font-size: 16px; }
    .summary-row.mask .summary-value { color: #8b5cf6; }
    .summary-row.paint .summary-value { color: #6366f1; }
    .summary-row.labor .summary-value { color: #10b981; }
    .total-row { margin-top: 20px; padding-top: 20px; border-top: 3px solid #3b82f6; display: flex; justify-content: space-between; align-items: center; }
    .total-label { font-size: 24px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 1px; }
    .total-value { font-size: 36px; font-weight: 800; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .notes { background: #fef3c7; border: 2px solid #fbbf24; border-radius: 12px; padding: 25px; margin-top: 30px; }
    .notes h3 { color: #92400e; font-size: 16px; font-weight: 700; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
    .notes p { color: #78350f; line-height: 1.6; font-size: 14px; }
    .footer { background: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px; }
    @media print { body { background: white; padding: 0; } .container { box-shadow: none; border-radius: 0; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>🎨 Paint Estimate</h1><div class="subtitle">Professional Painting Services</div></div>
    <div class="project-info">
      <h2>Project Details</h2>
      <div class="info-grid">
        <div class="info-item"><span class="info-label">Project:</span><span class="info-value">${project.project_name}</span></div>
        <div class="info-item"><span class="info-label">Client:</span><span class="info-value">${project.client_name}</span></div>
        ${project.estimate_number ? `<div class="info-item"><span class="info-label">Estimate #:</span><span class="info-value">${project.estimate_number}</span></div>` : ''}
        <div class="info-item"><span class="info-label">Date:</span><span class="info-value">${new Date().toLocaleDateString()}</span></div>
      </div>
    </div>
    <div class="content">
      <div class="section-title">Items Breakdown</div>
      ${project.items.map((item, i) => `
        <div class="item">
          <div class="item-header">Item ${i + 1}: ${item.description || `${item.item_type} item`}</div>
          <div class="item-details">
            <div class="detail-row"><span class="detail-label">Type:</span><span class="detail-value">${item.item_type}</span></div>
            <div class="detail-row"><span class="detail-label">Dimensions:</span><span class="detail-value">${item.length}"L × ${item.width}"H × ${item.thickness}"</span></div>
            <div class="detail-row"><span class="detail-label">Quantity:</span><span class="detail-value">${item.quantity}</span></div>
            <div class="detail-row"><span class="detail-label">Paint Sides:</span><span class="detail-value">${item.paint_sides}</span></div>
            <div class="detail-row"><span class="detail-label">Colors:</span><span class="detail-value">${item.paint_colors?.filter(c => c.trim() !== '').join(', ') || 'None'}</span></div>
            <div class="detail-row"><span class="detail-label">Labor Hours:</span><span class="detail-value">${(item.labor_hours || 0).toFixed(1)} hrs</span></div>
          </div>
          <div class="paint-volume-highlight">
            <div class="paint-volume-label">Paint Volume Required</div>
            <div class="paint-volume-value">${formatPaintVolume(item.paint_gallons || 0)}</div>
          </div>
          <div class="item-costs">
            <div class="cost-box mask"><div class="cost-label">Paint Mask</div><div class="cost-value">$${(item.supplies_cost || 0).toFixed(2)}</div></div>
            <div class="cost-box paint"><div class="cost-label">Paint & Supplies</div><div class="cost-value">$${(item.paint_cost || 0).toFixed(2)}</div></div>
            <div class="cost-box labor"><div class="cost-label">Labor Cost</div><div class="cost-value">$${(item.labor_cost || 0).toFixed(2)}</div></div>
          </div>
        </div>
      `).join('')}
      <div class="summary">
        <div class="section-title" style="border-color: #10b981;">Cost Summary</div>
        <div class="summary-row volume">
          <span class="summary-label">Total Paint Volume Required:</span>
          <span class="summary-value">${formatPaintVolume(totalGallonsNeeded)}${fixedWasteGallons > 0 ? `<div style="font-size: 11px; font-weight: normal; opacity: 0.8; margin-top: 4px;">(Includes ${formatPaintVolume(fixedWasteGallons)} fixed waste)</div>` : ''}</span>
        </div>
        <div class="summary-row mask"><span class="summary-label">Total Paint Mask:</span><span class="summary-value">$${totalPaintMask.toFixed(2)}</span></div>
        <div class="summary-row paint"><span class="summary-label">Liquid Paint & Supplies:</span><span class="summary-value">$${totalLiquidPaintAndSupplies.toFixed(2)}</span></div>
        <div class="summary-row"><span class="summary-label">Fixed Labor (Mixing/Setup):</span><span class="summary-value">$${((mixingHours + setupHours + totalColorChangeHours + totalPaintGunCleaningHours) * laborRate).toFixed(2)}</span></div>
        <div class="summary-row labor"><span class="summary-label">Total Labor (${totalLaborHours.toFixed(1)} hrs):</span><span class="summary-value">$${totalLabor.toFixed(2)}</span></div>
        <div class="total-row"><span class="total-label">Total Estimate</span><span class="total-value">$${totalCost.toFixed(2)}</span></div>
      </div>
      ${project.notes ? `<div class="notes"><h3>📝 Additional Notes</h3><p>${project.notes}</p></div>` : ''}
    </div>
    <div class="footer">Generated by SignEstimate Pro - Professional Estimating Suite<br>© ${new Date().getFullYear()} All Rights Reserved</div>
  </div>
</body>
</html>`;
}