import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AccountService } from 'app/core/auth/account.service';
import { Account } from 'app/core/auth/account.model';

import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { IPost } from '../entities/post/post.model';

import { ASC, DESC, ITEMS_PER_PAGE } from 'app/config/pagination.constants';
import { PostService } from '../entities/post/service/post.service';
import { PostDeleteDialogComponent } from '../entities/post/delete/post-delete-dialog.component';
import { DataUtils } from 'app/core/util/data-util.service';
import { ParseLinks } from 'app/core/util/parse-links.service';
import { any } from 'cypress/types/bluebird';

@Component({
  selector: 'jhi-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  listBlogs: any[];
  posts: IPost[];
  isLoading = false;
  itemsPerPage: number;
  links: { [key: string]: number };
  page: number;
  predicate: string;
  ascending: boolean;

  account: Account | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private accountService: AccountService,
    private router: Router,
    protected postService: PostService,
    protected dataUtils: DataUtils,
    protected modalService: NgbModal,
    protected parseLinks: ParseLinks) {
    this.listBlogs = [];
    this.posts = [];
    this.itemsPerPage = ITEMS_PER_PAGE;
    this.page = 0;
    this.links = {
      last: 0,
    };
    this.predicate = 'id';
    this.ascending = true;
  }
  loadAll(): void {
    this.isLoading = true;

    this.postService
      .queryPublic({
        page: this.page,
        size: this.itemsPerPage,
        sort: this.sort(),
      })
      .subscribe({
        next: (res: HttpResponse<IPost[]>) => {
          this.isLoading = false;
          this.paginatePosts(res.body, res.headers);
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }
  reset(): void {
    this.page = 0;
    this.listBlogs = [];
    this.posts = [];
    this.loadAll();
  }

  loadPage(page: number): void {
    this.page = page;
    this.loadAll();
  }
  ngOnInit(): void {
    this.loadAll();
    this.accountService
      .getAuthenticationState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(account => (this.account = account));
  }
  trackId(_index: number, item: IPost): number {
    return item.id!;
  }

  byteSize(base64String: string): string {
    return this.dataUtils.byteSize(base64String);
  }

  openFile(base64String: string, contentType: string | null | undefined): void {
    return this.dataUtils.openFile(base64String, contentType);
  }

  login(): void {
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  protected sort(): string[] {
    const result = [this.predicate + ',' + (this.ascending ? ASC : DESC)];
    if (this.predicate !== 'id') {
      result.push('id');
    }
    return result;
  }

  protected paginatePosts(data: IPost[] | null, headers: HttpHeaders): void {
    const linkHeader = headers.get('link');
    if (linkHeader) {
      this.links = this.parseLinks.parse(linkHeader);
    } else {
      this.links = {
        last: 0,
      };
    }
    if (data) {

      const listtitleBlogs = [];
      for (const d of data) {
        listtitleBlogs.push(d.blog?.name);
        this.posts.push(d);
      }
      const dataArr = new Set(listtitleBlogs);
      const titleBlogs = [...dataArr];

      const TemplistPostBlogs = [];
      for(const b of titleBlogs){
        TemplistPostBlogs.push({"title":String(b),"data":data.filter(post => post.blog?.name === b)});
      }
      this.listBlogs = TemplistPostBlogs;
     
      // eslint-disable-next-line no-console
      console.log(this.listBlogs);
    }
  }
}
