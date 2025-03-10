import { Component } from '@angular/core';
import { SearchService } from '../search.service';

@Component({
  selector: 'app-next-page-button',
  standalone: false,
  templateUrl: './next-page-button.component.html',
  styleUrl: './next-page-button.component.css'
})
export class NextPageButtonComponent {

  constructor(private searchService: SearchService) {

  }

  nextPage() {
    if (this.searchService.hasNextPage)
      this.searchService.nextPage();
  }
}
