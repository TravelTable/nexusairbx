module.exports = {
  initialize: jest.fn(),
  render: jest.fn(() => Promise.resolve({ svg: "<svg></svg>" })),
};
