using System;

namespace NetFilmx_Service.Search
{
    /// <summary>
    /// High-performance weighted Damerau-Levenshtein edit distance algorithm using Span and stackalloc
    /// to eliminate garbage collection allocations.
    /// </summary>
    public static class WeightedDamerauLevenshtein
    {
        private const double InsertionCost = 0.70;
        private const double DeletionCost = 0.70;
        private const double TranspositionCost = 0.30;

        /// <summary>
        /// Calculates weighted edit distance between s1 and s2 considering QWERTY keyboard physical distance.
        /// </summary>
        public static double CalculateDistance(ReadOnlySpan<char> s1, ReadOnlySpan<char> s2)
        {
            int len1 = s1.Length;
            int len2 = s2.Length;

            if (len1 == 0) return len2 * InsertionCost;
            if (len2 == 0) return len1 * DeletionCost;

            // Stackalloc for zero GC pressure (supports words up to 64 chars which covers all titles/terms)
            int bufSize = len2 + 1;
            Span<double> d0 = bufSize <= 128 ? stackalloc double[bufSize] : new double[bufSize];
            Span<double> d1 = bufSize <= 128 ? stackalloc double[bufSize] : new double[bufSize];
            Span<double> d2 = bufSize <= 128 ? stackalloc double[bufSize] : new double[bufSize];

            for (int j = 0; j <= len2; j++)
            {
                d1[j] = j * InsertionCost;
            }

            for (int i = 1; i <= len1; i++)
            {
                d2[0] = i * DeletionCost;
                char c1 = s1[i - 1];

                for (int j = 1; j <= len2; j++)
                {
                    char c2 = s2[j - 1];
                    double subCost = KeyboardLayout.GetSubstitutionCost(c1, c2);

                    double cost = d1[j - 1] + subCost; // Substitution
                    double delCost = d1[j] + DeletionCost; // Deletion
                    double insCost = d2[j - 1] + InsertionCost; // Insertion

                    if (delCost < cost) cost = delCost;
                    if (insCost < cost) cost = insCost;

                    // Damerau Transposition (adjacent swapped characters, e.g. "snitel" -> "sintel")
                    if (i > 1 && j > 1 && s1[i - 1] == s2[j - 2] && s1[i - 2] == s2[j - 1])
                    {
                        double transCost = d0[j - 2] + TranspositionCost;
                        if (transCost < cost) cost = transCost;
                    }

                    d2[j] = cost;
                }

                // Rotate row buffers
                d1.CopyTo(d0);
                d2.CopyTo(d1);
            }

            return d1[len2];
        }

        /// <summary>
        /// Calculates normalized similarity score between 0.0 (no match) and 1.0 (exact match).
        /// </summary>
        public static double CalculateSimilarity(ReadOnlySpan<char> query, ReadOnlySpan<char> target)
        {
            if (query.IsEmpty && target.IsEmpty) return 1.0;
            if (query.IsEmpty || target.IsEmpty) return 0.0;

            // Exact match
            if (query.Equals(target, StringComparison.OrdinalIgnoreCase))
            {
                return 1.0;
            }

            // Prefix match bonus (user typing beginning of word)
            if (target.StartsWith(query, StringComparison.OrdinalIgnoreCase))
            {
                double prefixRatio = (double)query.Length / target.Length;
                return 0.90 + (0.09 * prefixRatio);
            }

            // Substring match bonus
            if (target.ToString().Contains(query.ToString(), StringComparison.OrdinalIgnoreCase))
            {
                double subRatio = (double)query.Length / target.Length;
                return 0.82 + (0.10 * subRatio);
            }

            double distance = CalculateDistance(query, target);
            int maxLen = Math.Max(query.Length, target.Length);

            double score = 1.0 - (distance / maxLen);
            return Math.Max(0.0, Math.Min(1.0, score));
        }
    }
}
