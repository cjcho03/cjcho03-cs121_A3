import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import ollama from 'ollama';

const searchEndpoint = new URL("http://localhost:8080/search");

export interface DocResultType {
  url: string,
  title: string,
  description: string,
  score: number
}

interface SearchResult {
  query: string,
  page: number,
  per_page: number,
  total_results: number,
  elapsed_ms: number,
  results: DocResultType[]
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  searchString = "";
  searchSummary = "";
  searchResults: DocResultType[] = [];
  currentPage = 1;
  totalNumberOfResults = 0;
  resultsPerPage = 1;

  constructor(private router: Router, private http: HttpClient) { }
  get hasNextPage() {
    return this.currentPage < this.numberOfPages
  }

  get numberOfPages() {
    return Math.ceil(this.totalNumberOfResults / this.resultsPerPage);
  }

  doSearch(searchString: string) {
    this.searchString = searchString;
    this.searchSummary = "";
    this.currentPage = 1;
    this.totalNumberOfResults = 0;
    this.resultsPerPage = 1;

    searchEndpoint.searchParams.set("q", searchString);
    searchEndpoint.searchParams.set("page", String(this.currentPage));

    this.http.get<SearchResult>(searchEndpoint.toString()).subscribe(obj => {
      this.totalNumberOfResults = obj.total_results;
      this.resultsPerPage = obj.per_page;
      this.searchResults = obj.results;
      if (this.searchResults.length > 0)
        this.generateSummary().then(res => this.searchSummary = res);
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigate(["/search"], {
          onSameUrlNavigation: 'reload'
        });
      });
    });
  }

  nextPage() {
    if (!this.hasNextPage)
      return;
    searchEndpoint.searchParams.set("page", String(++this.currentPage));
    this.http.get<SearchResult>(searchEndpoint.toString()).subscribe(obj => {
      this.searchResults.push(...obj.results);
    });
  }

  private generateSummary() {
    const modelName = "gemma2:2b";
    return ollama.pull({ model: modelName }).then(res => {
      if (res.status === "success") {
        return ollama.chat({
          model: modelName,
          messages: [{
            role: "user",
            content: this.summaryPrompt()
          }]
        }).then(response => response.message.content);
      }
      return "";
    });
  }

  private summaryPrompt() {
    const prompt = `Generate a brief, simple, unformatted one to ten sentence paragraph summarizing following results when searching University of California, Irvine Computer Science websites for ${this.searchString}. These were the results sorted by relevance: ${this.searchResults.map((result, index) => index + ". " + result.url + " : " + result.title + " " + result.description).join(" ")}`;
    return prompt;
  }
}
