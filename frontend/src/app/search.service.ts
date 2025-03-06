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

  constructor(private router: Router, private http: HttpClient) { }

  doSearch(searchString: string) {

    this.searchString = searchString;
    searchEndpoint.searchParams.set("q", searchString);

    this.http.get<SearchResult>(searchEndpoint.toString()).subscribe(obj => {
      this.searchResults = obj.results;
      this.generateSummary().then(res => this.searchSummary = res);
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigate(["/search"], {
          onSameUrlNavigation: 'reload'
        });
      });
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
