const eslintConfig = [
  {
    ignores: [
      ".next/**/*",
      "node_modules/**/*",
      "dist/**/*"
    ]
  },
  {
    rules: {
      "no-unused-vars": "off",
      "react/no-unescaped-entities": "off",
      "react/react-in-jsx-scope": "off"
    }
  }
];

export default eslintConfig;
