import {
  applyProjectOperations,
  materializeProjectFromArtifacts,
  mergeFilesIntoProject,
} from "./chatProjectState";

describe("chatProjectState", () => {
  test("accumulates files across separate generations", () => {
    const project = materializeProjectFromArtifacts([
      {
        id: "gen_1",
        title: "Inventory",
        files: [
          {
            id: "inventory",
            path: "ServerScriptService/Inventory.server.lua",
            placement: "ServerScriptService",
            kind: "server",
            content: "print('inventory')",
          },
        ],
      },
      {
        id: "gen_2",
        title: "Shop",
        files: [
          {
            id: "shop",
            path: "ReplicatedStorage/Shop.lua",
            placement: "ReplicatedStorage",
            kind: "module",
            content: "return {}",
          },
        ],
      },
    ]);

    expect(project.files.map((file) => file.id)).toEqual(["inventory", "shop"]);
  });

  test("upserts an existing path instead of duplicating it", () => {
    const project = mergeFilesIntoProject(
      {
        id: "project_1",
        artifactId: "project_1",
        title: "Project",
        files: [
          {
            id: "inventory",
            path: "ReplicatedStorage/Inventory.lua",
            placement: "ReplicatedStorage",
            kind: "module",
            content: "return { value = 1 }",
          },
        ],
      },
      [
        {
          id: "inventory",
          path: "ReplicatedStorage/Inventory.lua",
          placement: "ReplicatedStorage",
          kind: "module",
          content: "return { value = 2 }",
        },
      ]
    );

    expect(project.files).toHaveLength(1);
    expect(project.files[0].content).toBe("return { value = 2 }");
  });

  test("delete and rename operations materialize current files", () => {
    const project = applyProjectOperations(
      {
        id: "project_1",
        artifactId: "project_1",
        title: "Project",
        files: [
          {
            id: "a",
            path: "ReplicatedStorage/Old.lua",
            placement: "ReplicatedStorage",
            kind: "module",
            content: "return {}",
          },
          {
            id: "b",
            path: "ReplicatedStorage/Unused.lua",
            placement: "ReplicatedStorage",
            kind: "module",
            content: "return true",
          },
        ],
      },
      [
        { type: "rename", id: "a", fromPath: "ReplicatedStorage/Old.lua", toPath: "ReplicatedStorage/New.lua" },
        { type: "delete", id: "b", path: "ReplicatedStorage/Unused.lua" },
      ]
    );

    expect(project.files).toHaveLength(1);
    expect(project.files[0]).toMatchObject({
      id: "a",
      path: "ReplicatedStorage/New.lua",
      name: "New.lua",
    });
  });
});
