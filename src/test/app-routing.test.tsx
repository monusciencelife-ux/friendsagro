import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
  it('matches the own account and selected investor history pages', () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes('/account').at(-1)?.routeId).toBe('/account');
    expect(router.matchRoutes('/investor/ac011f9a-f099-489b-9a13-9371eecac8bd').at(-1)?.routeId).toBe('/investor/$id');
  });
  it('matches every project detail beneath its project list layout', () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes('/projects/c8df837e-ccd4-4727-8d9c-ecedb27c89d4');
    expect(matches.map(match => match.routeId)).toEqual([rootRouteId, '/projects', '/projects/$id']);
    expect(matches.at(-1)?.params).toMatchObject({id:'c8df837e-ccd4-4727-8d9c-ecedb27c89d4'});
  });
});
