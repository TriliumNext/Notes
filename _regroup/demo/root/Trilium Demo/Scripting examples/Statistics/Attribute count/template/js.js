const attrCounts = await api.runOnBackend(() => {
    return api.sql.getRows(`
        SELECT
            name, COUNT(*) AS count
        FROM attributes
        WHERE isDeleted = 0
        GROUP BY name
        ORDER BY count DESC`);
});

renderPieChart(attrCounts.length <= 10 ? attrCounts : attrCounts.splice(0, 10));
renderTable(attrCounts);