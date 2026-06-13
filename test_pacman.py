import unittest

from pacman import LEVELS, MAZE, MazeGraph


class MazeGraphTests(unittest.TestCase):
    def setUp(self) -> None:
        self.graph = MazeGraph(MAZE)

    def test_maze_rows_are_rectangular(self) -> None:
        self.assertEqual({len(row) for row in MAZE}, {19})

    def test_open_cells_are_graph_nodes(self) -> None:
        self.assertTrue(self.graph.walkable((1, 1)))
        self.assertFalse(self.graph.walkable((0, 0)))

    def test_bfs_returns_shortest_valid_path(self) -> None:
        start = (1, 1)
        goal = (17, 1)
        path = self.graph.shortest_path(start, goal)

        self.assertEqual(path[0], start)
        self.assertEqual(path[-1], goal)
        for left, right in zip(path, path[1:]):
            self.assertIn(right, self.graph.neighbors(left))


class LevelTests(unittest.TestCase):
    def test_all_required_levels_exist(self) -> None:
        self.assertEqual(set(LEVELS), {"Easy", "Medium", "Hard"})

    def test_levels_get_faster_and_shorter(self) -> None:
        self.assertGreater(LEVELS["Easy"]["time_limit"], LEVELS["Medium"]["time_limit"])
        self.assertGreater(LEVELS["Medium"]["time_limit"], LEVELS["Hard"]["time_limit"])
        self.assertGreater(LEVELS["Easy"]["ghost_delay"], LEVELS["Medium"]["ghost_delay"])
        self.assertGreater(LEVELS["Medium"]["ghost_delay"], LEVELS["Hard"]["ghost_delay"])


if __name__ == "__main__":
    unittest.main()
