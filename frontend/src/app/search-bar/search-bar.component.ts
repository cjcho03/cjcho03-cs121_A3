import { Component, OnInit } from '@angular/core';
import { SearchService } from '../search.service';

@Component({
  selector: 'app-search-bar',
  standalone: false,
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.css'
})
export class SearchBarComponent implements OnInit {

  searchString = '';

  constructor(public searchService: SearchService) { }

  ngOnInit() {
    this.searchString = this.searchService.searchString || "";
  }

  submitSearch() {
    this.searchString = this.searchString.trim();
    console.log(this.searchString);
    if (this.searchString.length > 0)
      this.searchService.doSearch(this.searchString);
  }
}
