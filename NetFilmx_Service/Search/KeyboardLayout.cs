using System;
using System.Collections.Generic;

namespace NetFilmx_Service.Search
{
    /// <summary>
    /// Represents the 2D Cartesian layout of a standard QWERTY keyboard with row offsets
    /// and Polish diacritics proximity mapping for physical missclick tolerance.
    /// </summary>
    public static class KeyboardLayout
    {
        private static readonly Dictionary<char, (double X, double Y)> KeyCoordinates = new();
        private static readonly Dictionary<char, char> PolishDiacriticBaseMap = new()
        {
            {'ą', 'a'}, {'ć', 'c'}, {'ę', 'e'}, {'ł', 'l'}, {'ń', 'n'},
            {'ó', 'o'}, {'ś', 's'}, {'ź', 'z'}, {'ż', 'z'}
        };

        static KeyboardLayout()
        {
            // Row 0 (Number Row)
            string row0 = "1234567890-=";
            for (int i = 0; i < row0.Length; i++)
                KeyCoordinates[row0[i]] = (i, 0.0);

            // Row 1 (QWERTY) - offset 0.0
            string row1 = "qwertyuiop[]\\";
            for (int i = 0; i < row1.Length; i++)
                KeyCoordinates[row1[i]] = (i + 0.0, 1.0);

            // Row 2 (ASDF) - offset 0.45
            string row2 = "asdfghjkl;'";
            for (int i = 0; i < row2.Length; i++)
                KeyCoordinates[row2[i]] = (i + 0.45, 2.0);

            // Row 3 (ZXCV) - offset 0.90
            string row3 = "zxcvbnm,./";
            for (int i = 0; i < row3.Length; i++)
                KeyCoordinates[row3[i]] = (i + 0.90, 3.0);
        }

        /// <summary>
        /// Computes the weighted substitution penalty between two characters based on their physical Euclidean distance on QWERTY.
        /// </summary>
        public static double GetSubstitutionCost(char c1, char c2)
        {
            char a = char.ToLowerInvariant(c1);
            char b = char.ToLowerInvariant(c2);

            if (a == b) return 0.0;

            // Missing or added Polish diacritic (e.g. typing 'a' instead of 'ą') -> minimal penalty (0.10)
            if ((PolishDiacriticBaseMap.TryGetValue(a, out var baseA) && baseA == b) ||
                (PolishDiacriticBaseMap.TryGetValue(b, out var baseB) && baseB == a))
            {
                return 0.10;
            }

            // Standardize diacritics to base letters for coordinate comparison
            if (PolishDiacriticBaseMap.TryGetValue(a, out var normA)) a = normA;
            if (PolishDiacriticBaseMap.TryGetValue(b, out var normB)) b = normB;

            if (a == b) return 0.10;

            if (KeyCoordinates.TryGetValue(a, out var posA) && KeyCoordinates.TryGetValue(b, out var posB))
            {
                double dx = posA.X - posB.X;
                double dy = posA.Y - posB.Y;
                double distance = Math.Sqrt(dx * dx + dy * dy);

                // Immediate neighbor (missclick adjacent key: e.g. S <-> D, O <-> P, T <-> Y)
                if (distance <= 1.25)
                {
                    return 0.25;
                }
                
                // Close key (distance <= 2.2)
                if (distance <= 2.25)
                {
                    return 0.60;
                }

                // Medium distance
                if (distance <= 3.5)
                {
                    return 0.85;
                }
            }

            // Distant keys or unknown characters
            return 1.00;
        }
    }
}
