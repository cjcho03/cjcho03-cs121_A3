import { Component, Input } from '@angular/core';
import { DocResultType, SearchService } from '../search.service';

@Component({
  selector: 'app-search-result',
  standalone: false,
  templateUrl: './search-result.component.html',
  styleUrl: './search-result.component.css'
})
export class SearchResultComponent {
  @Input() searchResult: DocResultType = {
    title: "",
    description: "",
    score: 0,
    url: ""
  };

  constructor(public searchService: SearchService) { }

}
