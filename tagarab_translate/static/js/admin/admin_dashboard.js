document.addEventListener("DOMContentLoaded", function () {
    const assessmentParticipationData = {
      labels: ["Assessment "],
      datasets: [
        {
          label: "Number of Users",
          data: [120, 110, 105, 115, 125],
          backgroundColor: "rgba(0, 123, 255, 0.5)",
          borderColor: "rgba(0, 123, 255, 1)",
          borderWidth: 1,
        },
      ],
    };

    const passingRateData = {
      labels: ["Passing", "Failing"],
      datasets: [
        {
          data: [80, 20],
          backgroundColor: [
            "rgba(0, 123, 255, 0.5)",
            "rgba(255, 99, 132, 0.5)",
          ],
          borderColor: ["rgba(0, 123, 255, 1)", "rgba(255, 99, 132, 1)"],
          borderWidth: 1,
        },
      ],
    };

    const genderPassFailData = {
      labels: ["Male", "Female"],
      datasets: [
        {
          label: "Pass",
          data: [70, 60],
          backgroundColor: "rgba(0, 123, 255, 0.5)",
          borderColor: "rgba(0, 123, 255, 1)",
          borderWidth: 1,
        },
        {
          label: "Fail",
          data: [30, 40],
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1,
        },
      ],
    };

    const ctx1 = document
      .getElementById("assessmentParticipationChart")
      .getContext("2d");
    const ctx2 = document
      .getElementById("passingRateChart")
      .getContext("2d");
    const ctx3 = document
      .getElementById("genderPassFailChart")
      .getContext("2d");

    new Chart(ctx1, {
      type: "bar",
      data: assessmentParticipationData,
      options: {
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 10,
              precision: 0,
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
          },
          datalabels: {
            anchor: "end",
            align: "end",
            formatter: function (value) {
              return value;
            },
          },
        },
      },
    });

    new Chart(ctx2, {
      type: "pie",
      data: passingRateData,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            callbacks: {
              label: function (tooltipItem) {
                return `${tooltipItem.label}: ${tooltipItem.raw}%`;
              },
            },
          },
        },
      },
    });

    new Chart(ctx3, {
      type: "bar",
      data: genderPassFailData,
      options: {
        scales: {
          y: {
            beginAtZero: true,
          },
        },
        responsive: true,
        plugins: {
          legend: {
            position: "top",
          },
        },
      },
    });
  });