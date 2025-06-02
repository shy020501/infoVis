// 각 label의 한글 번역
const attributeLabels = {
  age: "나이",
  gender: "성별",
  study_hours_per_day: "공부 시간",
  social_media_hours: "SNS 사용 시간",
  netflix_hours: "Netflix 시청 시간",
  part_time_job: "알바 여부",
  attendance_percentage: "출석률",
  sleep_hours: "수면 시간",
  diet_quality: "식습관 상태",
  exercise_frequency: "운동 횟수",
  parental_education_level: "부모님 학력",
  internet_quality: "인터넷 상태",
  mental_health_rating: "정신 건강 상태",
  extracurricular_participation: "방과후 활동",
  exam_score: "시험 성적"
};

// Heatmap, scatterplot, grouped bar chart에서 사용될 attribute들
const heatmapAttributes = [
  "age", "study_hours_per_day", "social_media_hours", "netflix_hours",
  "attendance_percentage", "sleep_hours", "diet_quality",
  "exercise_frequency", "parental_education_level",
  "internet_quality", "mental_health_rating", "exam_score"
];

const scatterplotAttributes = [
    "study_hours_per_day", "sleep_hours", "social_media_hours",
    "netflix_hours", "attendance_percentage", "exam_score"
  ];

const groupableAttributes = [
  "exercise_frequency", "diet_quality", "parental_education_level", "internet_quality",
  "mental_health_rating", "extracurricular_participation", "part_time_job",
  "social_media_hours", "netflix_hours", "sleep_hours"
];

let selectedCircle = null;
let filteredData = null;
let currentGroupAttr = "exercise_frequency";

// csv 파일 불러오기
d3.csv("data/student_habits_performance.csv", d3.autoType).then(data => {
  createHeatmapControls(data);
  drawHeatmap(data, heatmapAttributes);
  createScatterAxisControls(scatterplotAttributes, data);
  drawScatterplot(data, "study_hours_per_day", "exam_score");
  renderEmptyStudentInfoBox();
  setupBarChart(data);
});

// Heatmap
function d3Correlation(data, attrX, attrY) { // Pearson Correlation
  const x = data.map(d => d[attrX]);
  const y = data.map(d => d[attrY]);
  const meanX = d3.mean(x);
  const meanY = d3.mean(y);
  const numerator = d3.sum(x.map((xi, i) => (xi - meanX) * (y[i] - meanY)));
  const denominator = Math.sqrt(
    d3.sum(x.map(xi => (xi - meanX) ** 2)) *
    d3.sum(y.map(yi => (yi - meanY) ** 2))
  );
  return denominator === 0 ? 0 : numerator / denominator;
}

d3.correlation = d3Correlation;

function getSelectedAttributes() {
  return Array.from(document.querySelectorAll('input[name="attr"]:checked'))
    .map(input => input.value);
}

function createHeatmapControls(data) {
  const form = d3.select("#attributeForm");
  form.selectAll("label")
    .data(heatmapAttributes)
    .enter()
    .append("label")
    .html(d => `<input type="checkbox" name="attr" value="${d}" checked> ${attributeLabels[d] || d}`);

  d3.selectAll('input[name="attr"]').on("change", () => {
    const selectedAttrs = getSelectedAttributes();
    drawHeatmap(data, selectedAttrs);
  });

  d3.select("#selectAll").on("click", () => {
    d3.selectAll('input[name="attr"]').property("checked", true);
    drawHeatmap(data, heatmapAttributes);
  });

  d3.select("#deselectAll").on("click", () => {
    d3.selectAll('input[name="attr"]').property("checked", false);
    drawHeatmap(data, []);
  });
}

function drawHeatmap(data, rawAttrs) {
  const encoders = {
    diet_quality: { "Poor": 1, "Fair": 2, "Good": 3 },
    parental_education_level: { "None": 1, "High School": 2, "Bachelor": 3, "Master": 4 },
    internet_quality: { "Poor": 1, "Average": 2, "Good": 3 }
  };

  d3.select("#heatmap-title")
    .text(`Correlation Heatmap (${data.length} students)`);

  const numericData = data.map(d => {
    const converted = {};
    for (const attr of rawAttrs) {
      converted[attr] = encoders[attr] ? encoders[attr][d[attr]] : d[attr];
    }
    return converted;
  });

  const matrix = rawAttrs.map(rowAttr =>
    rawAttrs.map(colAttr => +d3.correlation(numericData, rowAttr, colAttr).toFixed(2))
  );

  const size = 50;
  const margin = { top: 120, left: 175 };
  const width = rawAttrs.length * size;
  const height = rawAttrs.length * size;

  const maxCorr = 1.0;
  const minCorr = -1.0;
  const colorScale = d3.scaleSequential().domain([maxCorr, minCorr]).interpolator(d3.interpolateRdBu);

  const tooltip = d3.select("#tooltip");
  const svg = d3.select("#heatmap").attr("width", width + margin.left + 200).attr("height", height + margin.top + 100);
  svg.selectAll("*").remove();

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.selectAll("g")
    .data(matrix)
    .join("g")
    .attr("transform", (_, i) => `translate(0,${i * size})`)
    .selectAll("g")
    .data((row, i) => row.map((val, j) => ({
      val, row: i, col: j, rowName: rawAttrs[i], colName: rawAttrs[j]
    })))
    .join("g")
    .attr("transform", d => `translate(${d.col * size}, 0)`)
    .each(function(d) {
      const group = d3.select(this);

      group.append("rect")
        .attr("width", size)
        .attr("height", size)
        .attr("fill", colorScale(d.val))
        .on("mouseover", (event) => {
          tooltip.style("visibility", "visible")
            .html(`<strong>${attributeLabels[d.rowName]} ⟷ ${attributeLabels[d.colName]}</strong><br/>Correlation: ${d.val.toFixed(2)}`);
        })
        .on("mousemove", (event) => {
          tooltip.style("top", (event.pageY - 40) + "px").style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", () => tooltip.style("visibility", "hidden"));

      group.append("text")
        .attr("x", size / 2)
        .attr("y", size / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("fill", Math.abs(d.val) > 0.5 ? "white" : "black")
        .text(d.val.toFixed(2));
    });

  g.selectAll(".col-label")
    .data(rawAttrs)
    .join("text")
    .attr("x", 0)
    .attr("y", 0)
    .attr("transform", (d, i) => `translate(${i * size + size / 2}, -10) rotate(-45)`)
    .attr("text-anchor", "start")
    .attr("font-size", "18px")
    .text(d => attributeLabels[d] || d);

  g.selectAll(".row-label")
    .data(rawAttrs)
    .join("text")
    .attr("x", -20)
    .attr("y", (_, i) => i * size + size / 2)
    .attr("text-anchor", "end")
    .attr("dominant-baseline", "middle")
    .attr("font-size", "18px")
    .text(d => attributeLabels[d] || d);

  if (rawAttrs.length > 0) {
    const legendHeight = height;
    const legendScale = d3.scaleLinear().domain([minCorr, maxCorr]).range([legendHeight, 0]);
    const legendAxis = d3.axisRight(legendScale).ticks(5);

    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%").attr("y1", "100%")
      .attr("x2", "0%").attr("y2", "0%");

    gradient.selectAll("stop")
      .data(d3.range(0, 1.01, 0.01))
      .enter()
      .append("stop")
      .attr("offset", d => `${d * 100}%`)
      .attr("stop-color", d => colorScale(minCorr + d * (maxCorr - minCorr)));

    const legendG = svg.append("g").attr("transform", `translate(${width + margin.left + 50},${margin.top})`);

    legendG.append("rect")
      .attr("width", 20)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");

    legendG.append("g")
      .attr("transform", "translate(20,0)")
      .call(legendAxis)
      .selectAll("text")
      .style("font-size", "16px");
  }
}

// Scatterplot
function createScatterAxisControls(attrs, data) {
  const xForm = d3.select("#xAttrForm");
  const yForm = d3.select("#yAttrForm");

  xForm.selectAll("label")
    .data(attrs)
    .enter()
    .append("label")
    .html(d => `<input type="radio" name="xAttr" value="${d}" ${d === "study_hours_per_day" ? "checked" : ""}> ${attributeLabels[d] || d}`)
    .style("display", "inline-block")
    .style("margin-right", "10px");

  yForm.selectAll("label")
    .data(attrs)
    .enter()
    .append("label")
    .html(d => `<input type="radio" name="yAttr" value="${d}" ${d === "exam_score" ? "checked" : ""}> ${attributeLabels[d] || d}`)
    .style("display", "inline-block")
    .style("margin-right", "10px");

  function updateScatterplot() {
    const xAttr = document.querySelector('input[name="xAttr"]:checked').value;
    const yAttr = document.querySelector('input[name="yAttr"]:checked').value;
    drawScatterplot(data, xAttr, yAttr);
    clearStudentInfoBox();
  }

  d3.selectAll('input[name="xAttr"]').on("change", updateScatterplot);
  d3.selectAll('input[name="yAttr"]').on("change", updateScatterplot);
}

function drawScatterplot(data, xAttr, yAttr) {
  const svg = d3.select("#scatterplot");
  svg.selectAll("*").remove();
  selectedCircle = null;

  const margin = { top: 40, right: 40, bottom: 60, left: 70 };
  const width = +svg.attr("width") - margin.left - margin.right;
  const height = +svg.attr("height") - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain(d3.extent(data, d => d[xAttr])).range([0, width]);
  const y = d3.scaleLinear().domain(d3.extent(data, d => d[yAttr])).range([height, 0]);

  g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
  g.append("g").call(d3.axisLeft(y));

  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + 50)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .text(attributeLabels[xAttr] || xAttr);

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .text(attributeLabels[yAttr] || yAttr);

  const tooltip = d3.select("#tooltip");

  g.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => x(d[xAttr]))
    .attr("cy", d => y(d[yAttr]))
    .attr("r", 4)
    .attr("fill", "steelblue")
    .on("mouseover", (event, d) => {
      tooltip.style("visibility", "visible")
        .html(`<strong>${xAttr}:</strong> ${d[xAttr]}<br><strong>${yAttr}:</strong> ${d[yAttr]}`);
    })
    .on("mousemove", event => {
      tooltip.style("top", (event.pageY - 40) + "px").style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout", () => tooltip.style("visibility", "hidden"))
    .on("click", function(event, d) {
      if (selectedCircle) selectedCircle.attr("fill", "steelblue");
      selectedCircle = d3.select(this).attr("fill", "red");

      const infoTitle = d3.select("#student-info-title");
      const infoContent = d3.select("#student-info");

      infoTitle.text(`Student ${d.student_id}`);
      infoContent.html("");

      const quantitativeKeys = [
        "age", "study_hours_per_day", "social_media_hours", "netflix_hours",
        "attendance_percentage", "sleep_hours", "mental_health_rating", "exam_score"
      ];

      const averages = {};
      quantitativeKeys.forEach(key => {
        averages[key] = d3.mean(data, row => row[key]);
      });

      Object.entries(d).forEach(([key, value]) => {
        if (key === "student_id") return;
        const avgDisplay = quantitativeKeys.includes(key)
          ? ` (${averages[key].toFixed(1)})`
          : ` (N/A)`;

        infoContent.append("div")
          .style("display", "flex")
          .style("justify-content", "space-between")
          .style("margin-bottom", "9px")
          .html(`
            <span><strong>${attributeLabels[key] || key}</strong></span>
            <span class="value-container">
              <span class="student-value">${value}</span>
              <span class="average-value">${avgDisplay}</span>
            </span>
          `);
      });

      d3.select("#student-info-box").style("display", "block");
    });

  const brush = d3.brush()
    .extent([[0, 0], [width, height]])
    .on("end", brushEnded);

  g.append("g")
    .attr("class", "brush")
    .call(brush)
    .lower();

  function brushEnded({ selection }) {
    if (!selection) {
      filteredData = null;
      drawHeatmap(data, getSelectedAttributes());
      return;
    }

    const [[x0, y0], [x1, y1]] = selection;

    filteredData = data.filter(d => {
      const cx = x(d[xAttr]);
      const cy = y(d[yAttr]);
      return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
    });

    drawHeatmap(filteredData, getSelectedAttributes());
  }
}

function renderEmptyStudentInfoBox() {
  const keys = Object.keys(attributeLabels);
  const infoBox = d3.select("#student-info");
  infoBox.html("");

  keys.forEach(key => {
    infoBox.append("div")
      .attr("class", "info-row")
      .style("display", "flex")
      .style("justify-content", "space-between")
      .style("margin-bottom", "9px")
      .html(`<span><strong>${attributeLabels[key]}</strong></span><span class="info-value" data-key="${key}">-</span>`);
  });
}

function clearStudentInfoBox() {
  d3.select("#student-info-title").text("Selected Student");
  renderEmptyStudentInfoBox();
}


// Bar chart
function setupBarChart(data) {
  const container = d3.select("#group-attribute-controls");
  container.selectAll("*").remove();

  container.selectAll("label")
    .data(groupableAttributes)
    .enter()
    .append("label")
    .html(d => `
      <input type="radio" name="groupAttr" value="${d}" ${d === currentGroupAttr ? "checked" : ""}>
      ${attributeLabels[d] || d}
    `)
    .style("font-size", "16px");

  d3.selectAll('input[name="groupAttr"]').on("change", function () {
    currentGroupAttr = this.value;
    drawGroupedBarChart(data, currentGroupAttr);
  });

  drawGroupedBarChart(data, currentGroupAttr);
}

function drawGroupedBarChart(data, groupAttr) {
  const ordinalOrderings = {
    parental_education_level: ["None", "High School", "Bachelor", "Master"],
    internet_quality: ["Poor", "Average", "Good"],
    diet_quality: ["Poor", "Fair", "Good"]
  };

  const svg = d3.select("#barchart");
  svg.selectAll("*").remove();

  const margin = { top: 60, right: 30, bottom: 80, left: 60 };
  const width = +svg.attr("width") - margin.left - margin.right;
  const height = +svg.attr("height") - margin.top - margin.bottom;
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const roundedData = data.map(d => ({
    ...d,
    study_hours_rounded: Math.round(d.study_hours_per_day),
    groupKey: ["social_media_hours", "netflix_hours", "sleep_hours", "attendance_percentage"].includes(groupAttr)
      ? Math.round(d[groupAttr])
      : d[groupAttr]
  }));

  const grouped = d3.group(roundedData, d => d.study_hours_rounded, d => d.groupKey);
  const groups = Array.from(grouped, ([studyTime, innerMap]) => ({
    studyTime: +studyTime,
    values: Array.from(innerMap, ([key, items]) => ({
      groupKey: key,
      avgScore: d3.mean(items, d => d.exam_score)
    }))
  })).sort((a, b) => a.studyTime - b.studyTime);

  const x0 = d3.scaleBand()
    .domain(groups.map(d => d.studyTime))
    .range([0, width])
    .paddingInner(0.3);

  let groupKeys = [...new Set(roundedData.map(d => d.groupKey))];

  if (ordinalOrderings[groupAttr]) {
    const order = ordinalOrderings[groupAttr];
    groupKeys.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  } else {
    groupKeys.sort((a, b) => d3.ascending(a, b));
  }

  const x1 = d3.scaleBand()
    .domain(groupKeys)
    .range([0, x0.bandwidth()])
    .padding(0.3);

  const y = d3.scaleLinear()
    .domain([0, d3.max(groups, g => d3.max(g.values, v => v.avgScore))])
    .nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal(d3.schemeTableau10).domain(groupKeys);

  g.append("g")
    .selectAll("g")
    .data(groups)
    .join("g")
    .attr("transform", d => `translate(${x0(d.studyTime)},0)`)
    .selectAll("rect")
    .data(d => d.values.map(v => ({ ...v, studyTime: d.studyTime })))
    .join("rect")
    .attr("x", d => x1(d.groupKey))
    .attr("y", d => y(d.avgScore))
    .attr("width", x1.bandwidth())
    .attr("height", d => height - y(d.avgScore))
    .attr("fill", d => color(d.groupKey));

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x0).tickFormat(d => `${d} hours`))
    .selectAll("text")
    .style("text-anchor", "middle")
    .style("font-size", "13px")
    .attr("dy", "1em");

  g.append("g")
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("font-size", "12px");

  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + 55)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .text("공부 시간 (hour/day)");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .text("평균 시험 성적");

  const tooltip = d3.select("#tooltip");

  g.selectAll(".bar-group")
    .data(groups)
    .enter()
    .append("rect")
    .attr("x", d => x0(d.studyTime))
    .attr("y", 0)
    .attr("width", x0.bandwidth())
    .attr("height", height)
    .attr("fill", "transparent")
    .on("mouseover", (event, d) => {
      const ordering = ordinalOrderings[groupAttr];
      tooltip.style("visibility", "visible")
        .html(`<strong>${d.studyTime}시간 공부한 학생들의 평균 성적</strong><br>` +
          d.values
            .slice()
            .sort((a, b) => {
              if (ordering) return ordering.indexOf(a.groupKey) - ordering.indexOf(b.groupKey);
              return d3.ascending(a.groupKey, b.groupKey);
            })
            .map(v => `${v.groupKey} : ${v.avgScore.toFixed(1)}`)
            .join("<br>"));
    })
    .on("mousemove", event => {
      tooltip.style("top", (event.pageY - 40) + "px").style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout", () => tooltip.style("visibility", "hidden"));

  const legend = svg.append("g")
    .attr("transform", `translate(${margin.left}, 20)`);

  groupKeys.forEach((key, i) => {
    const legendRow = legend.append("g").attr("transform", `translate(${i * 110}, 0)`);
    legendRow.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color(key));
    legendRow.append("text")
      .attr("x", 18)
      .attr("y", 10)
      .text(key)
      .style("font-size", "14px");
  });
}
