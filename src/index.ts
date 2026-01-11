// --------------------
// Types
// --------------------

import { runQuery } from "./sdk/api.js"
import { 
  Candidates, 
  Entrypoint, 
  FilteringStage, 
  GenerationStage, 
  Pipeline, 
  RankingStage, 
  RawInput, RawStage, RetrievalStage, ScoringStage } from "./sdk/ingest.js"

type Product = {
  id: string
  title: string
  category: string
  price: number
  rating: number
  reviewCount: number
}

type RankedProduct = Product & {
  relevanceScore: number
}

// --------------------
// Pipeline Class
// --------------------

@Pipeline('CompetitorSelectionPipeline', { id: 'id' })
class CompetitorSelectionPipeline {
  private catalog: Product[]
  private id: string;

  constructor(catalog: Product[], id: string) {
    this.catalog = catalog
    this.id = id;
  }

  // --------------------
  // Entrypoint
  // --------------------

  @Entrypoint()
  public async run(sellerProduct: Product): Promise<Product | null> {
    console.log("Seller product:", sellerProduct)

    const keywords = await this.generateSearchKeywords(sellerProduct)
    console.log("Generated keywords:", keywords)

    const candidates = await this.retrieveCandidates(keywords)
    console.log(`Retrieved ${candidates.length} candidates`)

    let filtered = await this.applyHardFilters(sellerProduct, candidates)
    filtered = filtered.filter(f => f.passed);
    console.log(`After hard filters: ${filtered.length}`)

    const reranked = await this.llmReRankCandidates(sellerProduct, filtered)
    console.log("Top 5 after LLM rerank:", reranked.slice(0, 5))

    const cleaned = await this.llmEliminateFalsePositives(sellerProduct, reranked)
    console.log(`After LLM false-positive removal: ${cleaned.length}`)

    const best = await this.selectBestCompetitor(cleaned)
    console.log("Selected competitor:", best)

    return best
  }

  // --------------------
  // Step 1: LLM keyword generation (non-deterministic)
  // --------------------

  @GenerationStage("generate-search-keywords", {})
  private generateSearchKeywords(@RawInput('product') product: Product): string[] {
    const baseKeywords = [
      ...product.title.toLowerCase().split(" "),
      product.category.toLowerCase()
    ]

    // Simulate LLM randomness
    const noise = ["best", "cheap", "premium", "2025", "top"]
    const randomExtras = noise.sort(() => 0.5 - Math.random()).slice(0, 2)

    return Array.from(new Set([...baseKeywords, ...randomExtras]))
  }

  // --------------------
  // Step 2: Retrieve candidates (simulated API)
  // --------------------

  @RetrievalStage('retrieve-candidates', { id: 'id' })
  private retrieveCandidates(@RawInput('keywords') keywords: string[]): Product[] {
    return this.catalog.filter(p =>
      keywords.some(k => p.title.toLowerCase().includes(k))
    )
  }

  // --------------------
  // Step 3: Hard filters (deterministic)
  // --------------------


  @FilteringStage('filtering', { id: 'id', passed: 'passed' })
  private applyHardFilters(
    @RawInput('product') seller: Product,
    @Candidates('candidates') candidates: Product[]
  ): (Product & { passed: boolean })[] {
    return candidates.map(p => {
      const priceOk =
        p.price >= seller.price * 0.7 &&
        p.price <= seller.price * 1.3

      const ratingOk = p.rating >= 3.5
      const reviewsOk = p.reviewCount >= 50
      const categoryOk = p.category === seller.category

      const passed = priceOk && ratingOk && reviewsOk && categoryOk
      return {
        ...p,
        passed,
      }
    })
  }

  // --------------------
  // Step 4: LLM re-ranking (non-deterministic)
  // --------------------

  @RankingStage('llm-re-rank-candidates', { id: 'id' })
  private llmReRankCandidates(
    @RawInput('product') seller: Product,
    @Candidates('candidates') candidates: Product[]
  ): RankedProduct[] {
    return candidates
      .map(p => ({
        ...p,
        relevanceScore: this.simulateLLMRelevanceScore(seller, p)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  private simulateLLMRelevanceScore(
    seller: Product,
    candidate: Product
  ): number {
    let score = 0

    // Title similarity (very rough heuristic)
    seller.title.split(" ").forEach(word => {
      if (candidate.title.includes(word)) score += 1
    })

    // Price closeness
    score += 1 - Math.abs(candidate.price - seller.price) / seller.price

    // Random LLM noise
    score += Math.random() * 0.5

    return Number(score.toFixed(2))
  }

  // --------------------
  // Step 5: LLM false positive elimination (non-deterministic)
  // --------------------

  @RawStage('eliminate-false-positives')
  private llmEliminateFalsePositives(
    @RawInput('seller') seller: Product,
    @RawInput('candidates') candidates: RankedProduct[]
  ): RankedProduct[] {
    return candidates.filter(c => {
      // Simulate LLM judgment with randomness
      const probabilityRelevant = c.relevanceScore / 5
      return Math.random() < probabilityRelevant
    })
  }

  // --------------------
  // Step 6: Final selection
  // --------------------

  private selectBestCompetitor(
    candidates: RankedProduct[]
  ): Product | null {
    if (candidates.length === 0) return null
    return candidates[0] as Product;
  }
}

// --------------------
// Dummy Data
// --------------------

const dummyCatalog: Product[] = [
  {
    id: "p1",
    title: "Wireless Noise Cancelling Headphones",
    category: "Electronics",
    price: 120,
    rating: 4.4,
    reviewCount: 1200
  },
  {
    id: "p2",
    title: "Bluetooth Over Ear Headphones",
    category: "Electronics",
    price: 110,
    rating: 4.1,
    reviewCount: 800
  },
  {
    id: "p3",
    title: "Wired Studio Headphones",
    category: "Electronics",
    price: 90,
    rating: 4.6,
    reviewCount: 300
  },
  {
    id: "p4",
    title: "Wireless Earbuds",
    category: "Electronics",
    price: 70,
    rating: 4.0,
    reviewCount: 2000
  },
  {
    id: "p5",
    title: "Noise Cancelling Headphones Pro",
    category: "Electronics",
    price: 130,
    rating: 4.5,
    reviewCount: 950
  }
]

// Alternate dummy catalog with different count, prices, ratings, categories
const dummyCatalogAlt: Product[] = [
  {
    id: "a1",
    title: "Premium ANC Over-Ear Headphones",
    category: "Electronics",
    price: 220,
    rating: 4.8,
    reviewCount: 5400
  },
  {
    id: "a2",
    title: "Budget Wireless Headphones",
    category: "Electronics",
    price: 45,
    rating: 3.9,
    reviewCount: 120
  },
  {
    id: "a3",
    title: "Sports Bluetooth Earphones",
    category: "Wearables",
    price: 65,
    rating: 4.2,
    reviewCount: 760
  },
  {
    id: "a4",
    title: "Studio Reference Headphones Wired",
    category: "Electronics",
    price: 180,
    rating: 4.7,
    reviewCount: 430
  },
  {
    id: "a5",
    title: "Compact True Wireless Earbuds",
    category: "Electronics",
    price: 95,
    rating: 4.0,
    reviewCount: 1500
  },
  {
    id: "a6",
    title: "Vintage Wired Headphones",
    category: "Accessories",
    price: 55,
    rating: 3.6,
    reviewCount: 45
  },
  {
    id: "a7",
    title: "Noise Reduction Headset Pro Plus",
    category: "Electronics",
    price: 140,
    rating: 4.3,
    reviewCount: 980
  },
  {
    id: "a8",
    title: "Minimalist On-Ear Headphones",
    category: "Electronics",
    price: 75,
    rating: 3.8,
    reviewCount: 210
  }
]

// --------------------
// Example Run
// --------------------
const sellerProductAlt: Product = {
  id: "seller-2",
  title: "Compact True Wireless Earbuds",
  category: "Electronics",
  price: 99,
  rating: 4.2,
  reviewCount: 1800
}

// alias used by the later call to `pipeline.run(seller)`
const sellerProduct: Product = {
  id: "seller-1",
  title: "Wireless Noise Cancelling Headphones",
  category: "Electronics",
  price: 115,
  rating: 4.3,
  reviewCount: 400
}

// const pipeline = new CompetitorSelectionPipeline(dummyCatalog,'pipeline_0001' )
// pipeline.run(sellerProduct)

// const pipeline_alt = new CompetitorSelectionPipeline(dummyCatalogAlt, 'pipeline_0002');
// await pipeline_alt.run(sellerProductAlt)

// const result = await runQuery({
//   pipeline: {
//     id: 'pipeline_0001'
//   },
// })
// console.log(result);

const result = await runQuery({
  pipeline: {
    // id: 'pipeline_0001'
    label: 'CompetitorSelectionPipeline'
  },
  stage: {
    type: 'retrieval',
    // $retrievalCount: 6
    $retrievalCount: 6
  }
})

console.log(result);