import { Component, OnInit } from '@angular/core';
import { SearchService } from '../search.service';

@Component({
  selector: 'app-search-result',
  standalone: false,
  templateUrl: './search-result.component.html',
  styleUrl: './search-result.component.css'
})
export class SearchResultComponent implements OnInit {
  title = "";
  description = "Lorem ipsum docet lorem ipsum docet";

  constructor(public searchService: SearchService) { }

  ngOnInit() {
    this.title = this.searchService.searchString;
  }


}
