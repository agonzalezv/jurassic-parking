module.exports = (api) => {
  api.cache(false);
  const presets = [
    [
      "@babel/preset-env",
      {
        useBuiltIns: "usage",
        "corejs": 3,

      },
    ],
  ];

  return { presets };
};
